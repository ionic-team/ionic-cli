var fs = require('fs'),
    shelljs = require('shelljs/global'),
    argv = require('optimist').boolean(['no-cordova', 'sass', 'list', 'w']).argv,
    prompt = require('prompt'),
    colors = require('colors'),
    Q = require('q'),
    open = require('open'),
    IonicTemplates = require('./templates').IonicTask,
    IonicStore = require('./store').IonicStore,
    Task = require('./task').Task;
    IonicStats = require('./stats').IonicStats,
    cliLib = require('ionic-app-lib');

var Start = cliLib.start;

var IonicTask = function() {};
IonicTask.prototype = new Task();

IonicTask.prototype.run = function run(ionic) {

  if (argv.list || argv.l) {
    new IonicTemplates().run(ionic);
    return;
  }

  if (argv._.length < 2) {
    return this.ionic.fail('Invalid command', 'start');
  }

  if (argv._[1] == '.') {
    console.log('Please name your Ionic project something meaningful other than \'.\''.red);
    return
  }

  var promptPromise,
      options = Utils.preprocessCliOptions(argv);

  if (fs.existsSync(options.targetPath)) {
    promptPromise = Start.promptForOverwrite(options.targetPath);
  } else {
    promptPromise = Q(true);
  }

  promptPromise
  .then(function(promptToContinue) {
    if (!promptToContinue) {
      return
    }
    return Start.startApp(options);
  })
  .then(function() {
    return Start.printQuickHelp(options);
  })
  .then(function() {
    ionic.printNewsUpdates(true);
    return Start.promptLogin(options);
  })
  .then(function(requestLogin) {
  })
  .catch(function(error) {
    console.log('Run had an error:', error);
  });
};

exports.IonicTask = IonicTask;
