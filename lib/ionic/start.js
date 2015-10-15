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
    console.log('Please name your Ionic project something meaningful other than \'.\''.red);
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

  var isV2Start = argv.v2 || argv.v;

  return promptPromise
  .then(function(promptToContinue) {
    if (!promptToContinue) {
      startingApp = false;
      console.log('\nIonic start cancelled by user.\n'.red.bold);
      return;
    }
    if (isV2Start) {
      console.log('Starting an Ionic v2 application'.yellow.bold);
      return Start.startV2App(options);
    } else {
      return Start.startApp(options);
    }
  })
  .then(function() {
    if (startingApp && !isV2Start) {
      return Start.printQuickHelp(options);
    }
  })
  .then(function() {
    if (startingApp) {
      return ionic.printNewsUpdates(true);
    }
  })
  .then(function() {
    return Start.promptLogin(options);
  })
  .then(function() {
    if (isV2Start) {
      console.log('\nNew to Ionic? Get started here: http://ionicframework.com/docs/v2/getting-started\n'.green);
    }
  })
  .catch(function(error) {
    Utils.fail(error);
  });
};

exports.IonicTask = IonicTask;
