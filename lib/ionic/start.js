var fs = require('fs'),
    shelljs = require('shelljs/global'),
    // argv = require('optimist').boolean(['no-cordova', 'sass', 'list', 'w']).argv,
    prompt = require('prompt'),
    colors = require('colors'),
    Q = require('q'),
    IonicTemplates = require('./templates').IonicTask,
    IonicStore = require('./store').IonicStore,
    Task = require('./task').Task,
    IonicAppLib = require('ionic-app-lib'),
    Start = IonicAppLib.start,
    log = IonicAppLib.logging.logger,
    Utils = IonicAppLib.utils;


var Start;
var IonicTask = function() {};
IonicTask.prototype = new Task();

IonicTask.prototype.run = function run(ionic, argv) {

  if (argv.list || argv.l) {
    new IonicTemplates().run(ionic);
    return;
  }

  if (argv._.length < 2) {
    return ionic.fail('Invalid command', 'start');
  }

  if (argv._[1] == '.') {
    log.error('Please name your Ionic project something meaningful other than \'.\''.red);
    return
  }

  var promptPromise,
      options = Utils.preprocessCliOptions(argv),
      startingApp = true;
  // Grab the app's relative directory name

  if (fs.existsSync(options.targetPath)) {
    promptPromise = Start.promptForOverwrite(options.targetPath);
  } else {
    promptPromise = Q(true);
  }

  return promptPromise
  .then(function(promptToContinue) {
    if (!promptToContinue) {
      startingApp = false;
      log.info('\nIonic start cancelled by user.');
      return;
    }
    return Start.startApp(options);
  })
  .then(function() {
    if (startingApp) {
      return Start.printQuickHelp(options);
    }
  })
  /*
  .then(function() {
    if (startingApp) {
      return ionic.printNewsUpdates(true);
    }
  })
  */
  .then(function() {
    if (startingApp) {
      return Start.promptLogin(options);
    }
  })
  .then(function() {
    if (options.v2 && startingApp) {
      log.info('\nNew to Ionic? Get started here: http://ionicframework.com/docs/v2/getting-started\n');
    }
  })
  .catch(function(error) {
    // return Utils.fail(error);
    log.error(error);
    throw error;
  });
};

exports.IonicTask = IonicTask;
