'use strict';

var extend = Object.assign || require('util')._extend; // eslint-disable-line no-underscore-dangle
var os = require('os');
var Q = require('q');
var childProcess = require('child_process');
var IonicAppLib = require('ionic-app-lib');
var ConfigXml = IonicAppLib.configXml;
var log = IonicAppLib.logging.logger;
var cordovaUtils = require('../utils/cordova');

var settings = {
  title: 'build',
  name: 'build',
  summary: 'Build (prepare + compile) an Ionic project for a given platform.\n',
  args: {
    '[options]': '',
    '<PLATFORM>': ''
  },
  options: {
    '--nohooks|-n': {
      title: 'Do not add default Ionic hooks for Cordova',
      boolean: true
    }
  }
};

function run(ionic, argv, rawCliArguments) {
  var appDirectory = process.cwd();

  var cmdName = argv._[0].toLowerCase();

  // If platform was not passed then add it to the rawCliArguments
  var runPlatform = argv._[1];
  if (!runPlatform) {
    runPlatform = 'ios';
    rawCliArguments.push(runPlatform);
  }

  if (runPlatform === 'ios' && os.platform() !== 'darwin') {
    return Q.reject('✗ You cannot run iOS unless you are on Mac OSX.');
  }

  var promiseList = []
    .concat(!cordovaUtils.isPlatformInstalled(runPlatform, appDirectory) ?
      cordovaUtils.installPlatform(runPlatform) :
      [])
    .concat(!cordovaUtils.arePluginsInstalled(appDirectory) ?
      cordovaUtils.installPlugins() :
      []);

  return Q.all(promiseList).then(function() {

    // ensure the content node was set back to its original
    return ConfigXml.setConfigXml(appDirectory, {
      resetContent: true,
      errorWhenNotFound: false
    });
  })
  .then(function() {
    return runCordova(cmdName, argv, rawCliArguments);
  });
}

function runCordova(cmdName, argv, rawCliArguments) {
  var deferred = Q.defer();
  var cleanArgs = cordovaUtils.filterArgumentsForCordova(cmdName, argv, rawCliArguments);

  log.debug('Executing cordova cli: ' + cleanArgs.join(' '));
  var cordovaProcess = childProcess.exec('cordova ' + cleanArgs.join(' '));

  cordovaProcess.stdout.on('data', function(data) {
    process.stdout.write(data);
  });

  cordovaProcess.stderr.on('data', function(data) {
    if (data) {
      process.stderr.write(data.toString().bold);
    }
  });

  cordovaProcess.on('close', function(code) {
    if (code > 0) {
      return deferred.reject(code);
    }
    return deferred.resolve();
  });

  return deferred.promise;
}

module.exports = extend(settings, {
  run: run
});
