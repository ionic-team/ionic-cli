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

var IonicEmulateTask = function() {};

IonicEmulateTask.prototype = new IonicTask();

IonicEmulateTask.prototype.run = function(ionic) {
  var patform;

  if(argv._.length < 2) {
    return ionic.fail('No platforms specified.', 'emulate');
  }

  var platforms = argv._.slice(1);

  if(platforms.length < 1) {
    return ionic.fail('No platforms specified.', 'emulate');
  }

  IonicStats.t('emulate', { 'platform': platforms.join(',') });

  for(var i = 0; i < platforms.length; i++) {
    platform = platforms[i];
    console.log('Emulating app on platform', platform);
    if(exec("cordova emulate " + platform).code !== 0) {
      return ionic.fail('Unable to emulate app on platform ' + platform + '. Please see console for more info.');
    }
  }
};

exports.IonicEmulateTask = IonicEmulateTask;
