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

var IonicBuildTask = function() {
}

IonicBuildTask.HELP_LINE = 'Locally build an ionic project for a given platform';

IonicBuildTask.prototype = new IonicTask();

IonicBuildTask.prototype._printUsage = function() {
  process.stderr.write('\nUsage: ionic build platform [more platforms,...]\n');
}

IonicBuildTask.prototype.run = function(ionic) {
  if(argv._.length < 2) {
    IonicBuildTask.prototype._printUsage();
    ionic.fail('No platforms specified, exiting.');
  }

  var platforms = argv._.slice(1);

  if(platforms.length < 1) {
    ionic.fail('No platforms specified, exiting.');
  }

  IonicStats.t('build', { 'platform': platforms.join(',') });

  for(var i = 0; i < platforms.length; i++) {
    var platform = platforms[i];
    console.log('Building platform', platform);
    if(exec("cordova build " + platform).code !== 0) {
      ionic.fail('Unable to build app on platform ' + platform + '. Please see console for more info.');
    }
  }
};

exports.IonicBuildTask = IonicBuildTask;
