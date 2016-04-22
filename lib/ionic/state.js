var shelljs = require('shelljs');
var Task = require('./task').Task;
var IonicAppLib = require('ionic-app-lib');
var IonicProject = IonicAppLib.project;
var State = IonicAppLib.state;
var log = IonicAppLib.logging.logger;

// var State = module.exports;

shelljs.config.silent = true;

function IonicTask() {}

IonicTask.prototype = new Task();

IonicTask.prototype.run = function run(ionic, argv) {
  var options = { platforms: true, plugins: true };

  this.ionic = ionic;

  try {
    IonicProject.load();
  } catch (ex) {
    this.ionic.fail(ex.message);
    return;
  }

  // If either plugin or platforms is specified, set it to that value.
  if (argv.platforms || argv.plugins) {
    options = { platforms: argv.platforms, plugins: argv.plugins };
  }

  switch (argv._[1]) {
  case 'save':
    State.saveState(process.cwd(), options);
    break;
  case 'restore':
    State.restoreState(process.cwd(), options);
    break;
  case 'reset':
    State.resetState(process.cwd(), options);
    break;
  case 'clear':
    State.clearState(process.cwd(), options);
    break;
  default:
    log.error('Please specify a command [ save | restore | reset | clear ] for the state command.');
  }
};

exports.IonicTask = IonicTask;
