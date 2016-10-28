'use strict';

var chalk = require('chalk');
var extend = require('../utils/extend');
var fs = require('fs');
var path = require('path');
var shell = require('shelljs');
var request = require('request');
var unzip = require('unzip');
var argv = require('optimist').argv;
var prompt = require('prompt');
var IonicAppLib = require('ionic-app-lib');
var appLibUtils = IonicAppLib.utils;
var log = IonicAppLib.logging.logger;
var exec = require('child_process').exec;
var Q = require('q');

var settings =  {
  title: 'lib',
  name: 'lib',
  summary: 'Gets Ionic library version or updates the Ionic library',
  args: {
    '[options]': '',
    '[update]': 'Updates the Ionic Framework in www/lib/ionic'
  },
  options: {
    '--version|-v': 'Specific Ionic version\nOtherwise it defaults to the latest version'
  },
  isProjectTask: true
};

function run(ionic, argv) {

  // This command will be deprecated in the future.
  var deprecationMsg = 'This command has been ' + chalk.red('deprecated') + '.  All ' +
   'resources are currently available in NPM and we recommend that you use NPM to manage these.\n' +
   'More information is available here: https://github.com/driftyco/ionic-cli/wiki/Migrating-to-NPM-from-bower\n';
  log.info(chalk.bold(deprecationMsg));

  if (!fs.existsSync(path.resolve('www'))) {
    return appLibUtils.fail('"www" directory cannot be found. Make sure the working directory ' +
                      'is at the top level of an Ionic project.', 'lib');
  }

  // Gather version data from version.json or bower.json files
  var data = loadVersionData();

  // If this is an update command then do an update and exit
  if (argv._.length > 1 &&
      (argv._[1].toLowerCase() === 'update' || argv._[1].toLowerCase() === 'up')) {
    return updateLibVersion(data);
  }

  // Otherwise lets print the version info
  return printLibVersions(data);
}


function loadVersionData() {

  var versionFilePath = path.resolve('www/lib/ionic/version.json');
  var usesBower = false;
  var local = {};

  if (!fs.existsSync(versionFilePath)) {
    versionFilePath = path.resolve('www/lib/ionic/bower.json');
    usesBower = fs.existsSync(versionFilePath);
  }

  try {
    local = JSON.parse(fs.readFileSync(versionFilePath));
  } catch (e) {
    log.error('Unable to load ionic lib version information');
  }

  return {
    versionFilePath: versionFilePath,
    usesBower: usesBower,
    local: local
  };
}


function printLibVersions(data) {

  log.info(chalk.bold.green('Local Ionic version: ') + data.local.version + '  (' + data.versionFilePath + ')');

  getVersionData('latest').then(function(versionData) {
    log.info(chalk.bold.green('Latest Ionic version: ') + versionData.version_number +
             '  (released ' + versionData.release_date + ')');

    if (data.local.version !== versionData.version_number) {
      log.info(chalk.yellow(' * Local version is out of date'));
    } else {
      log.info(chalk.green(' * Local version up to date'));
    }
  });
}


function getVersionData(data, version) {
  var q = Q.defer();

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
      var versionData = JSON.parse(body);
      versionData['version_number'] = versionData.version_number || versionData.version;
      versionData['version_codename'] = versionData.version_codename || versionData.codename;
      versionData['release_date'] = versionData.release_date || versionData.date;

      q.resolve(versionData);
    } catch (e) {
      log.error('Error loading ' + chalk.bold(version) + ' version information');
      q.reject();
    }
  });

  return q.promise;
}


function updateLibVersion(data) {

  if (data.usesBower) {
    var bowerCmd = exec('bower update ionic');

    bowerCmd.stdout.on('data', function(data) {
      process.stdout.write(data);
    });

    bowerCmd.stderr.on('data', function(data) {
      if (data) {
        process.stderr.write(chalk.red.bold(data.toString()));
      }
    });

    return;
  }

  prompt.message = '';
  prompt.delimiter = '';
  prompt.start();

  var libPath = path.resolve('www/lib/ionic/');

  log.info(chalk.green.bold('Are you sure you want to replace ') + chalk.bold(libPath) +
           chalk.green.bold(' with an updated version of Ionic?'));

  var promptProperties = {
    areYouSure: {
      name: 'areYouSure',
      description: chalk.yellow.bold('(yes/no):'),
      required: true
    }
  };

  prompt.get({ properties: promptProperties }, function(err, promptResult) {
    if (err) {
      return log.error(err);
    }

    var areYouSure = promptResult.areYouSure.toLowerCase().trim();
    if (areYouSure === 'yes' || areYouSure === 'y') {
      getLatest(data);
    }
  });
}


function getLatest() {
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

  getVersionData(version).then(function(versionData) {
    if (version === 'latest') {
      log.info(chalk.bold.green('Latest version: ') + versionData.version_number +
               '  (released ' + versionData.release_date + ')');
    } else {
      log.info(chalk.bold.green('Version: ') + versionData.version_number +
               '  (released ' + versionData.release_date + ')');
    }
    downloadZip(versionData.version_number);
  });
}


function downloadZip(data, version) {
  var archivePath = 'https://github.com/driftyco/ionic-bower/archive/v' + version + '.zip';

  var tmpExtractPath = path.resolve('www/lib/.ionic');
  var tmpZipPath = path.join(data.tmpExtractPath, 'ionic.zip');

  if (!fs.existsSync(data.tmpExtractPath)) {
    fs.mkdirSync(data.tmpExtractPath);
  }

  log.info(chalk.bold.green('Downloading: ') + archivePath);

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
      fs.writeFileSync(tmpZipPath, body);
      updateFiles(data, tmpZipPath, tmpExtractPath);
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
      fs.unlink(tmpZipPath);
    } catch (e) {
      log.error(e);
    }
    log.error(err);
  });
}


function updateFiles(data, tmpZipPath, tmpExtractPath) {
  var ionicLibDir = path.resolve('www/lib/ionic');

  try {
    var readStream = fs.createReadStream(tmpZipPath);
    readStream.on('error', function(err) {
      log.debug('updateFiles readStream error: ' + err);
    });

    var writeStream = unzip.Extract({ path: tmpExtractPath }); // eslint-disable-line new-cap
    writeStream.on('close', function() {
      try {
        shell.rm('-rf', tmpZipPath);
      } catch (e) {
        log.error(e);
      }

      try {
        var dir = fs.readdirSync(tmpExtractPath);
        var copyFrom;
        for (var x = 0; x < dir.length; x += 1) {
          if (dir[x].indexOf('ionic') === 0) {
            copyFrom = path.join(tmpExtractPath, dir[x], '*');
          }
        }
        if (!copyFrom) {
          log.error('updateFiles, invalid zip');
          return;
        }

        shell.cp('-Rf', copyFrom, ionicLibDir);

        try {
          shell.rm('-rf', tmpExtractPath);
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

        log.info(chalk.bold.green('Ionic version updated to: ') + chalk.bold(data.versionData.version_number));

        writeVersionData(data);

        var ionicBower = require('../utils/bower').IonicBower;
        ionicBower.setIonicVersion(data.versionData.version_number);

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
}

function writeVersionData(data) {
  try {
    var versionData = {
      version: data.versionData.version_number || data.versionData.version,
      codename: data.versionData.version_codename || data.versionData.codename,
      date: data.versionData.release_date || data.versionData.date
    };

    fs.writeFileSync(path.resolve('www/lib/ionic/version.json'),
                      JSON.stringify(versionData, null, 2));

  } catch (e) {
    log.error('Error writing version data: ' + e);
  }
}

module.exports = extend(settings, {
  run: run
});
