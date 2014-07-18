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

var IonicPlatformTask = function() {};

IonicPlatformTask.prototype = new IonicTask();

IonicPlatformTask.prototype.run = function(ionic) {
  if(argv._.length < 2) {
    ionic.fail('No platforms specified.', 'platform');
  }

  // Grab the name of the app
  var argPlatforms = argv._.slice(1);

  var cordovaArgs = ['add', 'remove', 'rm', 'list', 'ls', 'update', 'up'];
  var cordovaArg = 'add';
  var platforms = [];

  for(var y=0; y<argPlatforms.length; y++) {
    var addPlatform = true;
    for(var x=0; x<cordovaArgs.length; x++) {
      if(argPlatforms[y].toLowerCase() == cordovaArgs[x]) {
        cordovaArg = argPlatforms[y].toLowerCase();
        addPlatform = false;
      }
    }
    if(addPlatform) {
      platforms.push(argPlatforms[y].toLowerCase());
    }
  }

  if(platforms.length < 1) {
    ionic.fail('No platforms specified.', 'platform');
  }

  if(cordovaArg == 'add') {
    IonicStats.t('platform', { 'platform': platforms.join(',') });
  }

  for(var i = 0; i < platforms.length; i++) {
    var platform = platforms[i].toLowerCase();
    console.log(cordovaArg, 'platform', platform);
    if(exec("cordova platform " + cordovaArg + " " + platform).code !== 0) {
      console.log( ('Unable to ' + cordovaArg + ' platform ' + platform + '.\n').bold.red );
    }
  }
};

exports.IonicPlatformTask = IonicPlatformTask;
