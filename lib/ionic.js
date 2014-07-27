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
    IonicCordovaTask = require('./ionic/cordova').IonicCordovaTask,
    IonicLoginTask = require('./ionic/login').IonicLoginTask,
    IonicUploadTask = require('./ionic/upload').IonicUploadTask,
    IonicPackageTask = require('./ionic/package').IonicPackageTask,
    IonicLibTask = require('./ionic/lib').IonicLibTask,
    IonicServeTask = require('./ionic/serve'),
    IonicProject = require('./ionic/project'),
    IonicStore = require('./ionic/store').IonicStore,
    path = require('path'),
    request = require('request'),
    os = require('os'),
    unzip = require('unzip'),
    colors = require('colors'),
    spawn = require('child_process').spawn,
    Q = require('q'),
    settings = require('../package.json');


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
    title: 'start',
    name: 'start',
    summary: 'Starts a new Ionic project in the specified PATH',
    args: {
      '[options]': 'any flags for the command',
      '<PATH>': 'directory for the new project',
      '[template]': 'Starter template to use (tabs, sidemenu, blank)'
    },
    options: {
      '--app-name|-a': 'Human readable name for the app (Use quotes around the name)',
      '--id|-i': 'Package name for <widget id> config, ie: com.mycompany.myapp',
      '--no-cordova|-w': 'Create a basic structure without Cordova requirements'
    },
    task: IonicStartTask
  },
  {
    title: 'serve',
    name: 'serve',
    summary: 'Start a local development server for app dev and testing',
    args: {
      '[options]': '',
      '[http-port]': '',
      '[livereload-port]': ''
    },
    options: {
      '--nobrowser|-b': 'Disable auto browser launch',
      '--nolivereload|-r': 'Do not start live reload'
    },
    task: IonicServeTask
  },
  {
    title: 'platform',
    name: 'platform',
    summary: 'Add platform target for building an Ionic app',
    args: {
      '[options]': '',
      '<PLATFORM>': ''
    },
    task: IonicCordovaTask
  },
  {
    title: 'emulate',
    name: 'emulate',
    summary: 'Emulate an Ionic project on a simulator or emulator',
    args: {
      '[options]': '',
      '<PLATFORM>': ''
    },
    task: IonicCordovaTask
  },
  {
    title: 'run',
    name: 'run',
    summary: 'Run an ionic project on a connected device',
    args: {
      '[options]': '',
      '<PLATFORM>': ''
    },
    options: {
      '--debug|--release': '',
      '--device|--emulator|--target=FOO': ''
    },
    task: IonicCordovaTask
  },
  {
    title: 'build',
    name: 'build',
    summary: 'Locally build an ionic project for a given platform',
    args: {
      '[options]': '',
      '<PLATFORM>': ''
    },
    task: IonicCordovaTask
  },
  {
    title: 'plugin add',
    name: 'plugin',
    summary: 'Add a Cordova plugin',
    args: {
      '[options]': '',
      '<SPEC>': 'Can be a plugin ID, a local path, or a git URL.'
    },
    options: {
      '--searchpath <directory>': 'When looking up plugins by ID, look in this directory and\n\
                                                 each of its subdirectories for the plugin before hitting the registry.'
    },
    task: IonicCordovaTask
  },
  {
    title: 'prepare',
    name: 'prepare',
    task: IonicCordovaTask
  },
  {
    title: 'compile',
    name: 'compile',
    task: IonicCordovaTask
  },
  {
    title: 'package',
    name: 'package',
    alt: ['pack'],
    summary: 'Package an app using the Ionic Build service',
    args: {
      '[options]': '',
      '<MODE>': '"debug" or "release"',
      '<PLATFORM>': '"ios" or "android"'
    },
    options: {
      '--android-keystore-file|-k': 'Android keystore file',
      '--android-keystore-alias|-a': 'Android keystore alias',
      '--android-keystore-password|-w': 'Android keystore password',
      '--android-key-password|-r': 'Android key password',
      '--ios-certificate-file|-c': 'iOS certificate file',
      '--ios-certificate-password|-d': 'iOS certificate password',
      '--ios-profile-file|-f': 'iOS profile file',
      '--output|-o': 'Path to save the packaged app',
      '--no-email|-n': 'Do not send a build package email',
      '--clear-signing|-l': 'Clear out all signing data from Ionic server',
      '--email|-e': 'Ionic account email',
      '--password|-p': 'Ionic account password'
    },
    task: IonicPackageTask
  },
  {
    title: 'upload',
    name: 'upload',
    summary: 'Upload an app to your Ionic account',
    options: {
      '--email|-e': 'Ionic account email',
      '--password|-p': 'Ionic account password'
    },
    alt: ['up'],
    task: IonicUploadTask
  },
  {
    title: 'lib',
    name: 'lib',
    summary: 'Gets Ionic library version info or updates the Ionic library',
    args: {
      '[options]': '',
      '[update]': 'Updates the Ionic Framework version in www/lib/ionic'
    },
    options: {
      '--version|-v': 'Exact Ionic version, otherwise it will default to the latest'
    },
    task: IonicLibTask
  },
  {
    title: 'login',
    name: 'login',
    task: IonicLoginTask
  }
];

Ionic = {
  IONIC_DASH: 'http://apps.ionicframework.com',
  //IONIC_DASH: 'http://localhost:8000',
  IONIC_API: '/api/v1/',
  PRIVATE_PATH: '.ionic',
  _tryBuildingTask: function() {
    if(argv._.length === 0) {
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

  printUsage: function(d) {
    var w = function(s) {
      process.stdout.write(s);
    };

    w('\n');

    var rightColumn = 45;
    var dots = '';
    var indent = '';
    var x, arg;

    var taskArgs = d.title;

    for(arg in d.args) {
      taskArgs += ' ' + arg;
    }

    w(taskArgs.green.bold);

    while( (taskArgs + dots).length < rightColumn + 1) {
      dots += '.';
    }

    w(' ' + dots.grey + '  ');

    w(d.summary.bold);

    for(arg in d.args) {
      if( !d.args[arg] ) continue;
      var argLine = arg;

      indent = '';
      w('\n');
      while(indent.length < rightColumn) {
        indent += ' ';
      }
      w( (indent + '    ' + argLine + ' ' + d.args[arg]).bold );
    }

    indent = '';
    while(indent.length < d.name.length + 1) {
      indent += ' ';
    }

    for(var opt in d.options) {
      w('\n');
      dots = '';

      var optLine = indent + '[' + opt + ']  ';

      w(optLine.yellow.bold);

      if(d.options[opt]) {
        while( (dots.length + optLine.length - 2) < rightColumn) {
          dots += '.';
        }
        w(dots.grey + '  ');

        w(d.options[opt].bold);
      }
    }

    w('\n');
  },

  _printAvailableTasks: function() {
    this._printIonic();
    process.stderr.write('\nUsage: ionic task args\n\n===============\n\n');

    if(process.argv.length > 2) {
      process.stderr.write( (process.argv[2] + ' is not a valid task\n\n').bold.red );
    }

    process.stderr.write('Available tasks: '.bold);
    process.stderr.write('(use --help or -h for more info)\n\n');

    for(var i = 0; i < TASKS.length; i++) {
      var task = TASKS[i];
      if(task.summary) {
        var name = '   ' + task.name + '  ';
        var dots = '';
        while((name + dots).length < 20) {
          dots += '.';
        }
        process.stderr.write(name.green.bold + dots.grey + '  ' + task.summary.bold + '\n');
      }
    }

    process.stderr.write('\n');
    this.processExit(1);
  },

  _printHelpLines: function() {
    this._printIonic();
    process.stderr.write('\n===================\n');

    for(var i = 0; i < TASKS.length; i++) {
      var task = TASKS[i];
      if(task.summary) {
        this.printUsage(task);
      }
    }

    process.stderr.write('\n');
    this.processExit(1);
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
    w(' |_|\\___/|_| |_|_|\\___|   v'+ settings.version + '\n');

  },

  _loadTaskRunner: function(which) {

  },

  run: function() {
    var self = this;

    self.checkLatestVersion();

    process.on('exit', function(){
      self.printVersionWarning();
    });

    if( (argv.version || argv.v) && !argv._.length) {
      return this.version();
    }

    if(argv.help || argv.h) {
      return this._printHelpLines();
    }

    var task = this._tryBuildingTask();
    if(!task) {
      return this._printAvailableTasks();
    }

    var taskObj = new task.task();
    taskObj.run(this);
  },

  fail: function(msg, taskHelp) {
    this.hasFailed = true;
    process.stderr.write(msg.error.bold);
    process.stderr.write('\n');
    if(taskHelp) {
      for(var i = 0; i < TASKS.length; i++) {
        var task = TASKS[i];
        if(task.name == taskHelp) {
          this.printUsage(task);
          process.stderr.write('\n');
          break;
        }
      }
    }
    process.stderr.write('\n');
    this.processExit(1);
  },

  version: function() {
    process.stderr.write('v' + settings.version + '\n');
  },

  checkLatestVersion: function() {
    this.latestVersion = Q.defer();
    var self = this;

    try {
      if(settings.version.indexOf('beta') > -1) {
        // don't bother checking if its a beta
        self.latestVersion.resolve();
        return;
      }

      // stay silent if it errors
      var ionicConfig = new IonicStore('ionic.config');
      var versionCheck = ionicConfig.get('versionCheck');
      if(versionCheck && ((versionCheck + 86400000) > Date.now() )) {
        // we've recently checked for the latest version, so don't bother again
        self.latestVersion.resolve();
        return;
      }

      var proxy = process.env.PROXY || null;
      request({ url: 'http://registry.npmjs.org/ionic/latest', proxy: proxy }, function(err, res, body) {
        try {
          self.npmVersion = JSON.parse(body).version;
          ionicConfig.set('versionCheck', Date.now());
          ionicConfig.save();
        } catch(e) {}
        self.latestVersion.resolve();
      });
    } catch(e) {
      self.latestVersion.resolve();
    }

  },

  printVersionWarning: function() {
    if(this.npmVersion && this.npmVersion != settings.version.trim()) {
      process.stdout.write('Ionic CLI is out of date:\n'.bold.yellow);
      process.stdout.write( (' * Locally installed version: ' + settings.version + '\n').yellow );
      process.stdout.write( (' * Latest version: ' + this.npmVersion + '\n').yellow );
      process.stdout.write( ' * Use '.yellow + 'npm update -g ionic'.info.bold + ' to update to the latest version\n\n'.yellow );
      this.npmVersion = null;
    }
  },

  processExit: function(code) {
    this.latestVersion.promise.then(function(){
      process.exit(code);
    });
  },

  spawnPromise: function(cmd, args, onStdOut, onStdErr) {
    var q = Q.defer();
    var child;
    console.log('\nRUNNING:'.info.bold, cmd, args.join(' '));
    try {
      child = spawn(cmd, args);
    } catch(e) {
    }
    child.stdout.setEncoding('utf8');
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

    // The folder name the project will be downloaded and extracted to
    var repoFolderName = repoName + '-master';
    console.log('\nDownloading:'.info.bold, repoUrl);

    var tmpFolder = os.tmpdir();
    var tempZipFilePath = path.join(tmpFolder, repoName + new Date().getTime() + '.zip');
    var tempZipFileStream = fs.createWriteStream(tempZipFilePath);

    var unzipRepo = function(fileName) {
      var readStream = fs.createReadStream(fileName);

      var writeStream = unzip.Extract({ path: targetPath });
      writeStream.on('close', function() {
        q.resolve(repoFolderName);
      });
      writeStream.on('error', function(err) {
        q.reject(err);
      });
      readStream.pipe(writeStream);
    };

    var proxy = process.env.PROXY || null;
    request({ url: repoUrl, encoding: null, proxy: proxy }, function(err, res, body) {
      if(res.statusCode !== 200) {
        q.reject(res);
        return;
      }
      try {
        tempZipFileStream.write(body);
        tempZipFileStream.close();
        unzipRepo(tempZipFilePath);
      } catch(e) {
        q.reject(e);
      }
    }).on('response', function(res){
      var ProgressBar = require('progress');
      var bar = new ProgressBar('[:bar]  :percent  :etas', {
        complete: '=',
        incomplete: ' ',
        width: 30,
        total: parseInt(res.headers['content-length'], 10)
      });

      res.on('data', function (chunk) {
        bar.tick(chunk.length);
      });
    });

    return q.promise;
  }

};

exports.Ionic = Ionic;
