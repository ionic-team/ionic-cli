var fs = require('fs'),
    os = require('os'),
    request = require('request'),
    ncp = require('ncp').ncp,
    path = require('path'),
    shelljs = require('shelljs/global'),
    unzip = require('unzip'),
    IonicTask = require('./task').IonicTask,
    IonicStats = require('./stats').IonicStats;

var argv = require('optimist').argv;

var IonicEmulateTask = function() {
}

IonicEmulateTask.HELP_LINE = 'Emulate an ionic project on a simulator or emulator.';

IonicEmulateTask.prototype = new IonicTask();

IonicEmulateTask.prototype._printUsage = function() {
  process.stderr.write('\nUsage: ionic emulate [platform]\n');
}

IonicEmulateTask.prototype.run = function(ionic) {
  var patform;

  if(argv._.length < 2) {
    IonicEmulateTask.prototype._printUsage();
    ionic.fail('No platforms specified, exiting.');
  }

  var platforms = argv._.slice(1);

  if(platforms.length < 1) {
    ionic.fail('No platforms specified, exiting.');
  }

  IonicStats.t('emulate', { 'platform': platforms.join(',') });

  for(var i = 0; i < platforms.length; i++) {
    platform = platforms[i];
    console.log('Emulating app on platform', platform);
    if(exec("cordova emulate " + platform).code !== 0) {
      ionic.fail('Unable to emulate app on platform ' + platform + '. Please see console for more info.');
    }
  }
};

exports.IonicEmulateTask = IonicEmulateTask;
