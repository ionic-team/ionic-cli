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

var IonicRunTask = function() {
}

IonicRunTask.HELP_LINE = 'Run an ionic project on a connected device.';

IonicRunTask.prototype = new IonicTask();

IonicRunTask.prototype._printUsage = function() {
  process.stderr.write('\nUsage: ionic run platform [more platforms,...]\n');
}

IonicRunTask.prototype.run = function(ionic) {
  if(argv._.length < 2) {
    IonicRunTask.prototype._printUsage();
    ionic.fail('No platforms specified, exiting.');
  }

  var platforms = argv._.slice(1);

  if(platforms.length < 1) {
    ionic.fail('No platforms specified, exiting.');
  }

  IonicStats.t('run', { 'platform': platforms.join(',') });

  for(var i = 0; i < platforms.length; i++) {
    var platform = platforms[i];
    console.log('Running app on platform', platform);
    if(exec("cordova run " + platform).code !== 0) {
      ionic.fail('Unable to run app on platform ' + platform + '. Please see console for more info.');
    }
  }
};

exports.IonicRunTask = IonicRunTask;
