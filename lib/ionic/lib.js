var fs = require('fs'),
    os = require('os'),
    shelljs = require('shelljs/global'),
    request = require('request'),
    path = require('path'),
    unzip = require('unzip'),
    argv = require('optimist').argv,
    prompt = require('prompt'),
    colors = require('colors'),
    exec = require('child_process').exec,
    Q = require('q'),
    Task = require('./task').Task,
    IonicStats = require('./stats').IonicStats;

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic) {
  var self = this;
  self.local = {};
  self.versionData = {};
  self.usesBower = false;

  if (!fs.existsSync( path.resolve('www') )) {
    return ionic.fail('"www" directory cannot be found. Make sure the working directory is at the top level of an Ionic project.', 'lib');
  }

  this.loadVersionData();

  if(argv._.length > 1 && (argv._[1].toLowerCase() == 'update' || argv._[1].toLowerCase() == 'up')) {
    this.updateLibVersion();
  } else {
    // just version info
    this.printLibVersions();
  }

};


IonicTask.prototype.loadVersionData = function() {
  this.versionFilePath = path.resolve('www/lib/ionic/version.json');
  if( !fs.existsSync(this.versionFilePath) ) {
    this.versionFilePath = path.resolve('www/lib/ionic/bower.json');
    this.usesBower = fs.existsSync(this.versionFilePath);
  }

  try {
    this.local = require(this.versionFilePath);
  } catch(e) {
    console.log('Unable to load ionic lib version information'.bold.error);
  }
};


IonicTask.prototype.printLibVersions = function() {
  var self = this;

  console.log('Local Ionic version: '.bold.green + this.local.version + '  (' + this.versionFilePath + ')');

  this.getVersionData('latest').then(function(){
    console.log('Latest Ionic version: '.bold.green + self.versionData.version_number + '  (released ' + self.versionData.release_date + ')');

    if(self.local.version != self.versionData.version_number) {
      console.log(' * Local version is out of date'.yellow );
    } else {
      console.log(' * Local version up to date'.green );
    }
  });
};


IonicTask.prototype.getVersionData = function(version) {
  var q = Q.defer();
  var self = this;

  var url = 'http://code.ionicframework.com';
  if(version == 'latest') {
    url += '/latest.json';
  } else {
    url += '/' + version + '/version.json';
  }

  var proxy = process.env.PROXY || process.env.http_proxy || null;
  request({ url: url, proxy: proxy }, function(err, res, body) {
    try {
      if(err || !res || !body) {
        console.log('Unable to receive version data');
        q.reject();
        return;
      }
      if(res.statusCode == 404) {
        console.log( ('Invalid version: ' + version).bold.red );
        q.reject();
        return;
      }
      if(res.statusCode >= 400) {
        console.log('Unable to load version data');
        q.reject();
        return;
      }
      self.versionData = JSON.parse(body);
      self.versionData.version_number = self.versionData.version_number || self.versionData.version;
      self.versionData.version_codename = self.versionData.version_codename || self.versionData.codename;
      self.versionData.release_date = self.versionData.release_date || self.versionData.date;

      q.resolve();
    } catch(e) {
      console.log('Error loading '.bold.error + version.bold + ' version information'.bold.error );
      q.reject();
    }
  });

  return q.promise;
};


IonicTask.prototype.updateLibVersion = function() {
  var self = this;

  if(self.usesBower) {
    var bowerCmd = exec('bower update ionic');

    bowerCmd.stdout.on('data', function (data) {
      process.stdout.write(data);
    });

    bowerCmd.stderr.on('data', function (data) {
      if(data) {
        process.stderr.write(data.toString().error.bold);
      }
    });

    return;
  }

  prompt.message = '';
  prompt.delimiter = '';
  prompt.start();

  var libPath = path.resolve('www/lib/ionic/');

  console.log('Are you sure you want to replace '.green.bold + libPath.bold + ' with an updated version of Ionic?'.green.bold);

  var promptProperties = {
    areYouSure: {
      name: 'areYouSure',
      description: '(yes/no):'.yellow.bold,
      required: true
    }
  };

  prompt.get({properties: promptProperties}, function (err, promptResult) {
    if(err) {
      return console.log(err);
    }

    var areYouSure = promptResult.areYouSure.toLowerCase().trim();
    if(areYouSure == 'yes' || areYouSure == 'y') {
      self.getLatest();
    }
  });
};


IonicTask.prototype.getLatest = function() {
  var self = this;

  var dirPath = path.resolve('www/lib/');
  if(!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }

  dirPath = path.resolve('www/lib/ionic/');
  if(!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }

  var version = argv.version || argv.v;
  if(version === true || !version) {
    version = 'latest';
  }

  this.getVersionData(version).then(function(){
    if(version == 'latest') {
      console.log('Latest version: '.bold.green + self.versionData.version_number + '  (released ' + self.versionData.release_date + ')');
    } else {
      console.log('Version: '.bold.green + self.versionData.version_number + '  (released ' + self.versionData.release_date + ')');
    }
    self.downloadZip(self.versionData.version_number);
  });

};


IonicTask.prototype.downloadZip = function(version) {
  var self = this;

  var archivePath = 'https://github.com/driftyco/ionic-bower/archive/v' + version + '.zip';

  self.tmpExtractPath = path.resolve('www/lib/.ionic');
  self.tmpZipPath = path.join(self.tmpExtractPath, 'ionic.zip');

  if( !fs.existsSync(self.tmpExtractPath) ) {
    fs.mkdirSync(self.tmpExtractPath);
  }

  console.log('Downloading: '.green.bold + archivePath);

  var proxy = process.env.PROXY || null;
  request({ url: archivePath, rejectUnauthorized: false, encoding: null, proxy: proxy }, function(err, res, body) {
    if(err) {
      console.log(err);
      return;
    }
    if(res.statusCode == 404 || res.statusCode == 406) {
      console.log( ('Invalid version: ' + version).bold.red );
      return;
    }
    if(res.statusCode >= 400) {
      console.log('Unable to download zip (' + res.statusCode + ')');
      return;
    }
    try {
      fs.writeFileSync(self.tmpZipPath, body);
      self.updateFiles();
    } catch(e) {
      console.error(e);
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
      try {
        bar.tick(chunk.length);
      } catch(e){}
    });

  }).on('error', function(err) {
    try {
      fs.unlink(self.tmpZipPath);
    } catch(e) {
      console.error(e);
    }
    console.error(err);
  });

};


IonicTask.prototype.updateFiles = function(version) {
  var self = this;
  var ionicLibDir = path.resolve('www/lib/ionic');

  try {
    var readStream = fs.createReadStream(self.tmpZipPath);
    readStream.on('error', function(err) {
      console.log( ('updateFiles readStream: ' + err).error );
    });

    var writeStream = unzip.Extract({ path: self.tmpExtractPath });
    writeStream.on('close', function() {
      try {
        rm('-rf', self.tmpZipPath)
      } catch(e){}

      try {
        var dir = fs.readdirSync(self.tmpExtractPath);
        var copyFrom;
        for(var x=0; x<dir.length; x++) {
          if( dir[x].indexOf('ionic') === 0 ) {
            copyFrom = path.join(self.tmpExtractPath, dir[x], '*');
          }
        }
        if(!copyFrom) {
          console.log('updateFiles, invalid zip');
          return;
        }

        cp('-Rf', copyFrom, ionicLibDir);

        try {
          rm('-rf', self.tmpExtractPath)
        } catch(e){}

        try {
          rm('-rf', path.join(ionicLibDir, 'README.md'));
        } catch(e){}

        try {
          rm('-rf', path.join(ionicLibDir, 'bower.json'));
        } catch(e){}

        console.log('Ionic version updated to: '.bold.green + self.versionData.version_number.bold );
        IonicStats.t();

        self.writeVersionData();

        var ionicBower = require('./bower').IonicBower;
        ionicBower.setIonicVersion(self.versionData.version_number);

      } catch(e){
        console.log('updateFiles Error: ' + e);
      }
    });
    writeStream.on('error', function(err) {
      console.log( ('updateFiles writeStream: ' + err).error );
    });
    readStream.pipe(writeStream);

  } catch(e) {
    console.log('updateFiles Error: ' + e);
  }

};

IonicTask.prototype.writeVersionData = function() {
  try {
    var versionData = {
      "version": this.versionData.version_number || this.versionData.version,
      "codename": this.versionData.version_codename || this.versionData.codename,
      "date": this.versionData.release_date || this.versionData.date
    };

    fs.writeFileSync( path.resolve('www/lib/ionic/version.json'),
                      JSON.stringify(versionData, null, 2) );

  } catch(e) {
    console.log( ('Error writing version data: ' + e).error.bold );
  }
};

exports.IonicTask = IonicTask;
