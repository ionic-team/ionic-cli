'use strict';

var _ = require('underscore');
var os = require('os');
var Q = require('q');
var exec = require('child_process').exec;
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

function run(ionic, argv) {
  var cmdName = process.argv[2].toLowerCase();
  var appDirectory = process.cwd();
  var runPlatform = argv._[1] || 'ios';

  if (runPlatform === 'ios' && os.platform() !== 'darwin') {
    return log.error('✗ You cannot run iOS unless you are on Mac OSX.');
  }

  var promiseList = []
    .concat(!cordovaUtils.isPlatformInstalled(runPlatform, appDirectory) ?
      cordovaUtils.installPlatform(runPlatform) :
      [])
    .concat(!cordovaUtils.arePluginsInstalled(appDirectory) ?
      cordovaUtils.installPlugins() :
      []);

  Q.all(promiseList).then(function() {

    // ensure the content node was set back to its original
    return ConfigXml.setConfigXml(appDirectory, {
      resetContent: true,
      errorWhenNotFound: false
    });
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

function runCordova(cmdName, argv) {
  var deferred = Q.defer();
  var cleanArgs = cordovaUtils.filterArgumentsForCordova(cmdName, argv);

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

  return deferred.promise;
}

module.exports = _.extend(settings, {
  run: run
});
