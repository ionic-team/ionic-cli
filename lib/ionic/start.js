require('shelljs/global');
require('colors');

var fs = require('fs');
var Q = require('q');
var IonicTemplates = require('./templates').IonicTask;
var IonicAppLib = require('ionic-app-lib');
var Start = IonicAppLib.start;
var log = IonicAppLib.logging.logger;
var Utils = IonicAppLib.utils;

function StartTask() {}

StartTask.prototype.run = function run(ionic, argv) {

  if (argv.list || argv.l) {
    new IonicTemplates().run(ionic);
    return;
  }

  if (argv._.length < 2) {
    return ionic.fail('Invalid command', 'start');
  }

  if (argv._[1] === '.') {
    log.error('Please name your Ionic project something meaningful other than \'.\''.red);
    return;
  }

  var promptPromise;
  var options = Utils.preprocessCliOptions(argv);
  var startingApp = true;

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
    log.error(error);
    throw error;
  });
};

exports.IonicTask = StartTask;
