var fs = require('fs'),
    os = require('os'),
    argv = require('optimist').argv,
    request = require('request'),
    ncp = require('ncp').ncp,
    path = require('path'),
    shelljs = require('shelljs/global'),
    unzip = require('unzip'),
    IonicTask = require('./task').IonicTask,
    IonicStats = require('./stats').IonicStats;

var IonicPlatformTask = function() {
}

IonicPlatformTask.HELP_LINE = 'Configure platform targets for building an Ionic app';

IonicPlatformTask.prototype = new IonicTask();

IonicPlatformTask.prototype._printUsage = function() {
  process.stderr.write('\nUsage: ionic platform [more platforms,...]\nSupported platforms currently "ios" and "android"\n\n');
}

IonicPlatformTask.prototype.run = function(ionic) {
  if(argv._.length < 2) {
    IonicPlatformTask.prototype._printUsage();
    ionic.fail('No platforms specified, exiting.');
  }

  // Grab the name of the app
  var platforms = argv._.slice(1);

  if(platforms.length < 1) {
    ionic.fail('No platforms specified, exiting.');
  }

  if(platforms[0].toLowerCase() == 'add') {
    platforms.shift();
  }

  IonicStats.t('platform', { 'platform': platforms.join(',') });

  for(var i = 0; i < platforms.length; i++) {
    var platform = platforms[i].toLowerCase();
    console.log('Adding platform', platform);
    if(exec("cordova platform add " + platform).code !== 0) {
      process.stderr.write('Unable to add platform ' + platform + '. Please see console for more info.\n');
    }
  }
};

exports.IonicPlatformTask = IonicPlatformTask;
