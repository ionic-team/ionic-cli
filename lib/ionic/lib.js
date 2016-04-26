require('colors');

var fs = require('fs');
var path = require('path');
var shell = require('shelljs');
var request = require('request');
var unzip = require('unzip');
var argv = require('optimist').argv;
var prompt = require('prompt');
var exec = require('child_process').exec;
var Q = require('q');
var log = require('ionic-app-lib').logging.logger;
var Task = require('./task').Task;

function IonicTask() {}

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic) {
  var self = this;
  self.local = {};
  self.versionData = {};
  self.usesBower = false;

  if (!fs.existsSync(path.resolve('www'))) {
    return ionic.fail('"www" directory cannot be found. Make sure the working directory ' +
                      'is at the top level of an Ionic project.', 'lib');
  }

  this.loadVersionData();

  if (argv._.length > 1 && (argv._[1].toLowerCase() === 'update' || argv._[1].toLowerCase() === 'up')) {
    this.updateLibVersion();
  } else {

    // just version info
    this.printLibVersions();
  }

};


IonicTask.prototype.loadVersionData = function() {
  this.versionFilePath = path.resolve('www/lib/ionic/version.json');

  if (!fs.existsSync(this.versionFilePath)) {
    this.versionFilePath = path.resolve('www/lib/ionic/bower.json');
    this.usesBower = fs.existsSync(this.versionFilePath);
  }

  try {
    this.local = require(this.versionFilePath);
  } catch (e) {
    log.error('Unable to load ionic lib version information');
  }
};


IonicTask.prototype.printLibVersions = function() {
  var self = this;

  log.info('Local Ionic version: '.bold.green + this.local.version + '  (' + this.versionFilePath + ')');

  this.getVersionData('latest').then(function() {
    log.info('Latest Ionic version: '.bold.green + self.versionData.version_number +
             '  (released ' + self.versionData.release_date + ')');

    if (self.local.version !== self.versionData.version_number) {
      log.info(' * Local version is out of date'.yellow);
    } else {
      log.info(' * Local version up to date'.green);
    }
  });
};


IonicTask.prototype.getVersionData = function(version) {
  var q = Q.defer();
  var self = this;

  var url = 'http://code.ionicframework.com';
  if (version === 'latest') {
    url += '/latest.json';
  } else {
    url += '/' + version + '/version.json';
  }

  var proxy = process.env.PROXY || process.env.http_proxy || null;
  request({ url: url, proxy: proxy }, function(err, res, body) {
    try {
      if (err || !res || !body) {
        log.error('Unable to receive version data');
        q.reject();
        return;
      }
      if (parseInt(res.statusCode, 10) === 404) {
        log.error('Invalid version: ' + version);
        q.reject();
        return;
      }
      if (parseInt(res.statusCode, 10) >= 400) {
        log.error('Unable to load version data');
        q.reject();
        return;
      }
      self.versionData = JSON.parse(body);
      self.versionData['version_number'] = self.versionData.version_number || self.versionData.version;
      self.versionData['version_codename'] = self.versionData.version_codename || self.versionData.codename;
      self.versionData['release_date'] = self.versionData.release_date || self.versionData.date;

      q.resolve();
    } catch (e) {
      log.error('Error loading ' + version.bold + ' version information');
      q.reject();
    }
  });

  return q.promise;
};


IonicTask.prototype.updateLibVersion = function() {
  var self = this;

  if (self.usesBower) {
    var bowerCmd = exec('bower update ionic');

    bowerCmd.stdout.on('data', function(data) {
      process.stdout.write(data);
    });

    bowerCmd.stderr.on('data', function(data) {
      if (data) {
        process.stderr.write(data.toString().red.bold);
      }
    });

    return;
  }

  prompt.message = '';
  prompt.delimiter = '';
  prompt.start();

  var libPath = path.resolve('www/lib/ionic/');

  log.info('Are you sure you want to replace '.green.bold + libPath.bold +
           ' with an updated version of Ionic?'.green.bold);

  var promptProperties = {
    areYouSure: {
      name: 'areYouSure',
      description: '(yes/no):'.yellow.bold,
      required: true
    }
  };

  prompt.get({ properties: promptProperties }, function(err, promptResult) {
    if (err) {
      return log.error(err);
    }

    var areYouSure = promptResult.areYouSure.toLowerCase().trim();
    if (areYouSure === 'yes' || areYouSure === 'y') {
      self.getLatest();
    }
  });
};


IonicTask.prototype.getLatest = function() {
  var self = this;

  var dirPath = path.resolve('www/lib/');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }

  dirPath = path.resolve('www/lib/ionic/');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }

  var version = argv.version || argv.v;
  if (version === true || !version) {
    version = 'latest';
  }

  this.getVersionData(version).then(function() {
    if (version === 'latest') {
      log.info('Latest version: '.bold.green + self.versionData.version_number +
               '  (released ' + self.versionData.release_date + ')');
    } else {
      log.info('Version: '.bold.green + self.versionData.version_number +
               '  (released ' + self.versionData.release_date + ')');
    }
    self.downloadZip(self.versionData.version_number);
  });

};


IonicTask.prototype.downloadZip = function(version) {
  var self = this;

  var archivePath = 'https://github.com/driftyco/ionic-bower/archive/v' + version + '.zip';

  self.tmpExtractPath = path.resolve('www/lib/.ionic');
  self.tmpZipPath = path.join(self.tmpExtractPath, 'ionic.zip');

  if (!fs.existsSync(self.tmpExtractPath)) {
    fs.mkdirSync(self.tmpExtractPath);
  }

  log.info('Downloading: '.green.bold + archivePath);

  var proxy = process.env.PROXY || null;
  request({ url: archivePath, rejectUnauthorized: false, encoding: null, proxy: proxy }, function(err, res, body) {
    if (err) {
      log.error(err);
      return;
    }
    if (parseInt(res.statusCode, 10) === 404 || parseInt(res.statusCode, 10) === 406) {
      log.error('Invalid version: ' + version);
      return;
    }
    if (parseInt(res.statusCode, 10) >= 400) {
      log.error('Unable to download zip (' + res.statusCode + ')');
      return;
    }
    try {
      fs.writeFileSync(self.tmpZipPath, body);
      self.updateFiles();
    } catch (e) {
      log.error(e);
    }
  }).on('response', function(res) {

    var ProgressBar = require('progress');
    var bar = new ProgressBar('[:bar]  :percent  :etas', {
      complete: '=',
      incomplete: ' ',
      width: 30,
      total: parseInt(res.headers['content-length'], 10)
    });

    res.on('data', function(chunk) {
      try {
        bar.tick(chunk.length);
      } catch (e) {
        log.error(e);
      }
    });

  }).on('error', function(err) {
    try {
      fs.unlink(self.tmpZipPath);
    } catch (e) {
      log.error(e);
    }
    log.error(err);
  });

};


IonicTask.prototype.updateFiles = function() {
  var self = this;
  var ionicLibDir = path.resolve('www/lib/ionic');

  try {
    var readStream = fs.createReadStream(self.tmpZipPath);
    readStream.on('error', function(err) {
      log.debug('updateFiles readStream error: ' + err);
    });

    var writeStream = unzip.Extract({ path: self.tmpExtractPath }); // eslint-disable-line new-cap
    writeStream.on('close', function() {
      try {
        shell.rm('-rf', self.tmpZipPath);
      } catch (e) {
        log.error(e);
      }

      try {
        var dir = fs.readdirSync(self.tmpExtractPath);
        var copyFrom;
        for (var x = 0; x < dir.length; x += 1) {
          if (dir[x].indexOf('ionic') === 0) {
            copyFrom = path.join(self.tmpExtractPath, dir[x], '*');
          }
        }
        if (!copyFrom) {
          log.error('updateFiles, invalid zip');
          return;
        }

        shell.cp('-Rf', copyFrom, ionicLibDir);

        try {
          shell.rm('-rf', self.tmpExtractPath);
        } catch (e) {
          log.error(e);
        }

        try {
          shell.rm('-rf', path.join(ionicLibDir, 'README.md'));
        } catch (e) {
          log.error(e);
        }

        try {
          shell.rm('-rf', path.join(ionicLibDir, 'bower.json'));
        } catch (e) {
          log.error(e);
        }

        log.info('Ionic version updated to: '.bold.green + self.versionData.version_number.bold);

        self.writeVersionData();

        var ionicBower = require('./bower').IonicBower;
        ionicBower.setIonicVersion(self.versionData.version_number);

      } catch (e) {
        log.error('updateFiles Error: ' + e);
      }
    });
    writeStream.on('error', function(err) {
      log.error('updateFiles writeStream: ' + err);
    });
    readStream.pipe(writeStream);

  } catch (e) {
    log.error('updateFiles Error: ' + e);
  }

};

IonicTask.prototype.writeVersionData = function() {
  try {
    var versionData = {
      version: this.versionData.version_number || this.versionData.version,
      codename: this.versionData.version_codename || this.versionData.codename,
      date: this.versionData.release_date || this.versionData.date
    };

    fs.writeFileSync(path.resolve('www/lib/ionic/version.json'),
                      JSON.stringify(versionData, null, 2));

  } catch (e) {
    log.error('Error writing version data: ' + e);
  }
};

exports.IonicTask = IonicTask;
