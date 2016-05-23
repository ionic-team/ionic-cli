var fs = require('fs'),
    shelljs = require('shelljs/global'),
    // argv = require('optimist').boolean(['no-cordova', 'sass', 'list', 'w']).argv,
    prompt = require('prompt'),
    colors = require('colors'),
    Q = require('q'),
    open = require('open'),
    IonicTemplates = require('./templates').IonicTask,
    IonicStore = require('./store').IonicStore,
    Task = require('./task').Task,
    IonicStats = require('./stats').IonicStats,
    IonicAppLib = require('ionic-app-lib'),
    Start = IonicAppLib.start,
    Utils = IonicAppLib.utils;

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
    console.log('Please name your Ionic project something more meaningful than \'.\''.red);
    return
  }

  var promptPromise,
      options = Utils.preprocessCliOptions(argv),
      startingApp = true;
  // Grab the app's relative directory name

  IonicStats.t();

  if (fs.existsSync(options.targetPath)) {
    promptPromise = Start.promptForOverwrite(options.targetPath);
  } else {
    promptPromise = Q(true);
  }

  return promptPromise
  .then(function(promptToContinue) {
    if (!promptToContinue) {
      startingApp = false;
      console.log('\nIonic start cancelled by user.\n'.red.bold);
      return;
    }
    return Start.startApp(options);
  })
  .then(function() {
    if (startingApp) {
      Start.printQuickHelp(options);
      return Start.promptLogin(options);
    }
  })
  .then(function() {
    if (startingApp) {
      return ionic.printNewsUpdates(true);
    }
  })
  .catch(function(error) {
    Utils.fail(error);
  });
};

exports.IonicTask = IonicTask;
