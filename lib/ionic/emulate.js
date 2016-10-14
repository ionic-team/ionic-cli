'use strict';

var extend = require('../utils/extend');
var npmScripts = require('../utils/npmScripts');
var os = require('os');
var Q = require('q');
var IonicAppLib = require('ionic-app-lib');
var ConfigXml = IonicAppLib.configXml;
var log = IonicAppLib.logging.logger;
var cordovaUtils = require('../utils/cordova');

var cordovaRunEmulateOptions = {
  '--livereload|-l': 'Live reload app dev files from the device' + ' (beta)'.yellow,
  '--address': 'Use specific address (livereload req.)',
  '--port|-p': 'Dev server HTTP port (8100 default, livereload req.)',
  '--livereload-port|-r': 'Live Reload port (35729 default, livereload req.)',
  '--consolelogs|-c': {
    title: 'Print app console logs to Ionic CLI (livereload req.)',
    boolean: true
  },
  '--serverlogs|-s': {
    title: 'Print dev server logs to Ionic CLI (livereload req.)',
    boolean: true
  },
  '--debug|--release': {
    title: '',
    boolean: true
  },
  '--device|--emulator|--target=FOO': ''
};

var settings = {
  title: 'emulate',
  name: 'emulate',
  summary: 'Emulate an Ionic project on a simulator or emulator',
  args: {
    '<PLATFORM>': '',
    '[options]': ''
  },
  options: cordovaRunEmulateOptions,
  isProjectTask: true
};

function run(ionic, argv, rawCliArguments) {
  var appDirectory = process.cwd();
  var rawArgs = rawCliArguments.slice(0);
  var cmdName = argv._[0].toLowerCase();

  var isLiveReload = argv.livereload || argv['live-reload'] || argv.l || false;

  // If platform was not passed then add it to the rawArgs
  var runPlatform = argv._[1];
  if (!runPlatform) {
    runPlatform = 'ios';
    rawArgs.push(runPlatform);
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
      return npmScripts.runIonicScript('build');
    }
    return Q.resolve();
  })
  .then(function() {
    if (isLiveReload) {
      return cordovaUtils.setupLiveReload(argv, appDirectory);
    }

    // ensure the content node was set back to its original
    return ConfigXml.setConfigXml(appDirectory, {
      resetContent: true,
      errorWhenNotFound: false
    });
  })
  .then(function(serveOptions) {
    var optionList = cordovaUtils.filterArgumentsForCordova(cmdName, argv, rawArgs);
    return cordovaUtils.execCordovaCommand(optionList, isLiveReload, serveOptions);
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
