'use strict';

var extend = Object.assign || require('util')._extend; // eslint-disable-line no-underscore-dangle
var os = require('os');
var Q = require('q');
var childProcess = require('child_process');
var IonicAppLib = require('ionic-app-lib');
var ConfigXml = IonicAppLib.configXml;
var log = IonicAppLib.logging.logger;
var Serve = IonicAppLib.serve;
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
    '[options]': '',
    '<PLATFORM>': ''
  },
  options: cordovaRunEmulateOptions,
  isProjectTask: true
};

function run(ionic, argv, rawCliArguments) {
  var appDirectory = process.cwd();
  var rawArgs = rawCliArguments.slice(0);
  var isLiveReload = argv.livereload || argv['live-reload'] || argv.l;
  var cmdName = argv._[0].toLowerCase();

  // If platform was not passed then add it to the rawArgs
  var runPlatform = argv._[1];
  if (!runPlatform) {
    runPlatform = 'ios';
    rawArgs.push(runPlatform);
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
    if (isLiveReload) {
      return cordovaUtils.setupLiveReload(argv);
    }

    // ensure the content node was set back to its original
    return ConfigXml.setConfigXml(process.cwd(), {
      resetContent: true,
      errorWhenNotFound: false
    });
  })
  .then(function(serveOptions) {
    return runCordova(cmdName, argv, rawArgs, serveOptions);
  });
}

function runCordova(cmdName, argv, rawArgs, serveOptions) {
  var deferred = Q.defer();
  var isLiveReload = argv.livereload || argv['live-reload'] || argv.l;
  var cleanArgs = cordovaUtils.filterArgumentsForCordova(cmdName, argv, rawArgs);

  log.debug('Executing cordova cli: ' + cleanArgs.join(' '));
  var cordovaProcess = childProcess.exec('cordova ' + cleanArgs.join(' '));

  cordovaProcess.stdout.on('data', function(data) {
    log.info(data);
  });

  cordovaProcess.stderr.on('data', function(data) {
    if (data) {
      log.error(data.toString().bold);
    }
  });

  cordovaProcess.on('close', function(code) {
    if (code > 0) {
      return deferred.reject(code);
    }
    return deferred.resolve();
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
