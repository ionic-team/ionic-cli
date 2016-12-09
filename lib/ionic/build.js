'use strict';

var extend = require('../utils/extend');
var npmScripts = require('../utils/npmScripts');
var os = require('os');
var Q = require('q');
var IonicAppLib = require('ionic-app-lib');
var ConfigXml = IonicAppLib.configXml;
var log = IonicAppLib.logging.logger;
var cordovaUtils = require('../utils/cordova');

var settings = {
  title: 'build',
  name: 'build',
  summary: 'Build (prepare + compile) an Ionic project for a given platform.\n',
  args: {
    '<PLATFORM>': '',
    '[options]': ''
  },
  options: {
    '--nohooks|-n': {
      title: 'Do not add default Ionic hooks for Cordova',
      boolean: true
    }
  },
  isProjectTask: true
};

function run(ionic, argv, rawCliArguments) {
  var appDirectory = process.cwd();
  var rawArgs = rawCliArguments.slice(0);
  var cmdName = settings.name;

  // If platform was not passed then add it to the rawArgs
  var runPlatform = argv._[1];
  if (!runPlatform) {
    runPlatform = 'ios';
    rawArgs.splice(1, 0, runPlatform);
  }

  if (runPlatform === 'ios' && os.platform() !== 'darwin') {
    log.error('✗ You cannot run iOS unless you are on Mac OSX.');
    return Q();
  }

  var promiseList = []
    .concat(!cordovaUtils.isPlatformInstalled(runPlatform, appDirectory) ?
      cordovaUtils.installPlatform(runPlatform) :
      [])
    .concat(!cordovaUtils.arePluginsInstalled(appDirectory) ?
      cordovaUtils.installPlugins() :
      []);

  return Q.all(promiseList).then(function() {
    return npmScripts.hasIonicScript('build');
  })
  .then(function(hasBuildCommand) {
    if (hasBuildCommand) {
      return npmScripts.runIonicScript('build', rawArgs.slice(2));
    }
    return Q.resolve();
  })
  .then(function() {

    // ensure the content node was set back to its original
    return ConfigXml.setConfigXml(appDirectory, {
      resetContent: true,
      errorWhenNotFound: false
    });
  })
  .then(function() {
    var optionList = cordovaUtils.filterArgumentsForCordova(cmdName, argv, rawArgs);
    return cordovaUtils.execCordovaCommand(optionList);
  })
  .catch(function(ex) {
    if (ex instanceof Error) {
      log.error(ex);
    }
  });
}

module.exports = extend(settings, {
  run: run
});
