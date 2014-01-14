var fs = require('fs'),
    os = require('os'),
    request = require('request'),
    ncp = require('ncp').ncp,
    path = require('path'),
    shelljs = require('shelljs/global'),
    unzip = require('unzip'),
    IonicTask = require('./task').IonicTask;

var argv = require('optimist').argv;

var IonicBuildTask = function() {
}

IonicBuildTask.HELP_LINE = 'Locally build an ionic project for a given platform';

IonicBuildTask.prototype = new IonicTask();

IonicBuildTask.prototype._printUsage = function() {
  process.stderr.write('\nUsage: ionic build [platform]\n');
}

IonicBuildTask.prototype.run = function(ionic) {
  var patform;

  if(argv._.length < 2) {
    IonicBuildTask.prototype._printUsage();
    ionic.fail('No platforms specified, exiting.');
  }

  var platforms = argv._.slice(1);

  if(platforms.length < 1) {
    ionic.fail('No platforms specified, exiting.');
  }

  for(var i = 0; i < platforms.length; i++) {
    platform = platforms[i];
    console.log('Building platform', platform);
    if(exec("cordova build " + platform).code !== 0) {
      ionic.fail('Unable to build app on platform ' + platform + '. Please see console for more info.');
    }
  }
};

exports.IonicBuildTask = IonicBuildTask;
