'use strict';

var extend = Object.assign || require('util')._extend; // eslint-disable-line no-underscore-dangle
var Q = require('q');
var exec = require('child_process').exec;
var IonicAppLib = require('ionic-app-lib');
var ConfigXml = IonicAppLib.configXml;
var Cordova = IonicAppLib.cordova;
var log = IonicAppLib.logging.logger;
var Serve = IonicAppLib.serve;
var cordovaUtils = require('../utils/cordova');

var settings = {
  title: 'prepare',
  name: 'prepare',
  module: './ionic/cordova'
};

function run(ionic, argv) {
  var cmdName = process.argv[2].toLowerCase();
  var appDirectory = process.cwd();

  // ensure the content node was set back to its original
  ConfigXml.setConfigXml(appDirectory, {
    resetContent: true,
    errorWhenNotFound: false
  })
  .then(function() {
    return runCordova(cmdName, argv);
  })
  .catch(function(ex) {
    log.error('Error happened', ex);
    log.error(ex.stack);
    throw ex;
  });
}

function runCordova(cmdName, argv, serveOptions) {
  var deferred = Q.defer();
  var cleanArgs = cordovaUtils.filterArgumentsForCordova(cmdName, argv);
  var cordovaIsInstalled = cordovaUtils.isCordovaInstalled();

  log.debug('Cordova is installed:', cordovaIsInstalled);

  // If Cordova is not installed we will use the cordova-lib
  if (!cordovaIsInstalled) {
    log.debug('Executing cordova without CLI: ' + cleanArgs);

    // If no cordova CLI is installed, fall back to local cordova-lib.
    // TODO: Add ability to be smart = only use this if cordova CLI is not installed.
    // TODO: Enable passing variables with the plugins
    // TODO: Enable checking for multiple platforms/plugins/ls
    // ex: (multiple plugin ids) ionic plugin add cordova-plugin-camera cordova-plugin-geolocation
    //    (multiple platforms) ionic platform add ios android
    //    (listing) ionic plugin ls
    //    (version) ionic platform add ios@8.1.1
    //    (variables) ionic plugin add cordova-plugin-facebook --variable APP_ID=1 --variable APP_NAME="Goofballs"
    var promise;

    switch (true) {
    case cmdName === 'run':
      promise = Cordova.runPlatform(process.cwd(), cleanArgs[1]);
      break;
    case cmdName === 'platform' && cleanArgs[1] === 'add':
      promise = Cordova.addPlatform(process.cwd(), cleanArgs[2], true);
      break;
    case cmdName === 'platform' && cleanArgs[1] === 'remove':
      promise = Cordova.removePlatform(process.cwd(), cleanArgs[2], true);
      break;
    case cmdName === 'plugin' && cleanArgs[1] === 'add':
      promise = Cordova.addPlugin(process.cwd(), cleanArgs[2], null, true);
      break;
    case cmdName === 'plugin' && cleanArgs[1] === 'remove':
      promise = Cordova.removePlugin(process.cwd(), cleanArgs[2]);
      break;
    }
    return promise.then(function(result) {
      log.info('cleanArgs[0]', cleanArgs[0], 'completed');
      log.debug('Result from cordova-lib:', result);
    });
  }

  log.debug('Executing cordova cli: ' + cleanArgs.join(' '));
  var cordovaProcess = exec('cordova ' + cleanArgs.join(' '));

  cordovaProcess.stdout.on('data', function(data) {
    process.stdout.write(data);
  });

  cordovaProcess.stderr.on('data', function(data) {
    if (data) {
      process.stderr.write(data.toString().bold);
    }
  });

  cordovaProcess.on('close', function(code) {
    deferred.resolve(code);
  });

  if (isLiveReload) {
    cordovaProcess.on('exit', function() {

      Serve.printCommandTips(serveOptions);
      setTimeout(function() {

        // set it back to the original src after a few seconds
        ConfigXml.setConfigXml(process.cwd(), {
          resetContent: true,
          errorWhenNotFound: true
        });

        // deferred.resolve();
      }, 5000);
    });

    process.on('exit', function() {

      // verify it was set back
      ConfigXml.setConfigXml(process.cwd(), {
        resetContent: true,
        errorWhenNotFound: false
      });
    });

    var readLine = require('readline');
    if (process.platform === 'win32') {
      var rl = readLine.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.on('SIGINT', function() {
        process.emit('SIGINT');
      });
    }

    process.on('SIGINT', function() {
      process.exit();
    });
  }

  return deferred.promise;
}

module.exports = extend(settings, {
  run: run
});
