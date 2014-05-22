/*
 _             _      
(_)           (_)     
 _  ___  _ __  _  ___ 
| |/ _ \| '_ \| |/ __|
| | (_) | | | | | (__ 
|_|\___/|_| |_|_|\___|

http://ionicframework.com/

A utility for starting and administering Ionic based mobile app projects.
Licensed under the MIT license. See LICENSE For more.

Copyright 2014 Drifty (http://drifty.com/)
*/
                   
var IonicStartTask = require('./ionic/start').IonicStartTask,
    IonicPlatformTask = require('./ionic/platform').IonicPlatformTask,
    IonicRunTask = require('./ionic/run').IonicRunTask,
    IonicEmulateTask = require('./ionic/emulate').IonicEmulateTask;
    IonicBuildTask = require('./ionic/build').IonicBuildTask,
    IonicLoginTask = require('./ionic/login').IonicLoginTask,
    IonicUploadTask = require('./ionic/upload').IonicUploadTask,
    IonicPackageTask = require('./ionic/package').IonicPackageTask,
    IonicServeTask = require('./ionic/serve'),
    IonicProject = require('./ionic/project'),
    path = require('path'),
    request = require('request'),
    os = require('os'),
    unzip = require('unzip'),
    colors = require('colors'),
    spawn = require('child_process').spawn,
    Q = require('q'),
    settings = require('../package.json')


colors.setTheme({
    silly: 'rainbow',
    input: 'grey',
    small: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    info: 'white',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red'
});


var fs = require('fs'), 
    argv = require('optimist').argv;

var TASKS = [
  {
    title: 'serve',
    name: 'serve',
    usage: '',
    task: IonicServeTask
  },
  {
    title: 'start',
    name: 'start',
    usage: 'appname',
    task: IonicStartTask
  }, 
  {
    title: 'emulate',
    name: 'emulate',
    usage: 'emulate',
    task: IonicEmulateTask
  },
  {
    title: 'run',
    name: 'run',
    usage: 'run',
    task: IonicRunTask
  },
  {
    title: 'build',
    name: 'build',
    usage: 'build',
    task: IonicBuildTask
  },
  {
    title: 'platform',
    name: 'platform',
    usage: 'platform',
    task: IonicPlatformTask
  },
  {
    title: 'login',
    name: 'login',
    usage: '[email]',
    task: IonicLoginTask
  },
  {
    title: 'upload',
    name: 'upload',
    alt: ['up'],
    usage: '',
    task: IonicUploadTask
  },
  /*
  {
    title: 'package',
    name: 'package',
    alt: ['pack'],
    usage: 'mode platform',
    task: IonicPackageTask
  }
  */
];

Ionic = {
  IONIC_DASH: 'http://apps.ionicframework.com/',
  //IONIC_DASH: 'http://localhost:8000/',
  IONIC_COOKIES: 'ionic.cookies',
  IONIC_API: 'api/v1/',  
  _tryBuildingTask: function() {
    if(argv._.length == 0) {
      return false;
    }
    var taskName = argv._[0];

    return this._getTaskWithName(taskName);
  },

  _getTaskWithName: function(name) {
    for(var i = 0; i < TASKS.length; i++) {
      var t = TASKS[i];
      if(t.name === name) {
        return t;
      }
      if(t.alt) {
        for(var j = 0; j < t.alt.length; j++) {
          var alt = t.alt[j];
          if(alt === name) {
            return t;
          }   
        }
      }
    }
  },

  _printGenericUsage: function() {
    this._printIonic();
    process.stderr.write('Usage: ionic task args\n\n===============\n\nAvailable tasks:\n\n');

    for(var i = 0; i < TASKS.length; i++) {
      var task = TASKS[i];
      process.stderr.write('  ' + task.name + ' - ' + task.task.HELP_LINE + '\n');
    }

    process.stderr.write('\n');
    process.exit(1);
  },

  _printIonic: function() {
    var w = function(s) {
      process.stdout.write(s);
    };

    w('  _             _     \n');
    w(' (_)           (_)     \n');
    w('  _  ___  _ __  _  ___ \n');
    w(' | |/ _ \\| \'_ \\| |/ __|\n');
    w(' | | (_) | | | | | (__ \n');
    w(' |_|\\___/|_| |_|_|\\___|\n');

  },

  _loadTaskRunner: function(which) {

  },

  run: function() {
    if(argv.version) {
      console.log('Ionic CLI version ' + settings.version);
      process.exit(0);
    }

    var task = this._tryBuildingTask();
    if(!task) {
      return this._printGenericUsage();
    }

    console.log('Running', task.title.info.bold, 'task...')

    var taskObj = new task.task();
    taskObj.run(this);
  },

  fail: function(msg) {
    process.stderr.write('ERROR: ');
    process.stderr.write(msg.error.bold + '\nExiting.\n');
    process.exit(1);
  },

  spawnPromise: function(cmd, args, onStdOut, onStdErr) {
    var q = Q.defer();
    console.log('\nRUNNING:'.info.bold, cmd, args.join(' '));
    try {
      var child = spawn(cmd, args);
    } catch(e) {
    }
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', function(data) {
      process.stdout.write(data);
      onStdOut && onStdOut(data);
    });
    child.stderr.on('data', function(data) {
      process.stderr.write(data);
      onStdErr && onStdErr(data);
    });
    child.on('error', function(err) {
      q.reject(err);
    });
    child.on('exit', function(code) {
      if(code === 0) {
        q.resolve();
      } else {
        q.reject(code);
      }
    });
    return q.promise;
  },
  /**
   * Fetch a repo from GitHub, unzip it to a specific folder.
   */
  fetchRepo: function(targetPath, repoName, repoUrl) {
    var q = Q.defer();

    var proxy = process.env.PROXY || null;

    // The folder name the project will be downloaded and extracted to
    var repoFolderName = repoName + '-master';
    console.log('\nDOWNLOADING:'.info.bold, repoUrl);

    var tmpFolder = os.tmpdir();
    var tempZipFilePath = path.join(tmpFolder, repoName + new Date().getTime() + '.zip');
    var tempZipFileStream = fs.createWriteStream(tempZipFilePath)

    var unzipRepo = function(fileName) {
      var readStream = fs.createReadStream(fileName);

      var writeStream = unzip.Extract({ path: targetPath });
      writeStream.on('close', function() {
        q.resolve(repoFolderName);
      });
      readStream.pipe(writeStream);
    };

    request({ url: repoUrl, encoding: null, proxy: proxy }, function(err, res, body) {
      if(res.statusCode !== 200) {
        q.reject(res);
        return;
      }
      tempZipFileStream.write(body);
      tempZipFileStream.close();
      unzipRepo(tempZipFilePath);
    });

    return q.promise;
  },

  getLocalIps: function() {
    var interfaces = os.networkInterfaces();
    var addresses = [];
    for (k in interfaces) {
      for (k2 in interfaces[k]) {
        var address = interfaces[k][k2];
        if (address.family == 'IPv4' && !address.internal) {
          addresses.push(address.address)
        }
      }
    }

    return addresses;
  }
};

exports.Ionic = Ionic;
