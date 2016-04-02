var fs = require('fs'),
    path = require('path'),
    argv = require('optimist').argv,
    Q = require('q'),
    shelljs = require('shelljs'),
    Task = require('./task').Task,
    IonicInfo = require('./info').IonicTask,
    IonicAppLib = require('ionic-app-lib'),
    log = IonicAppLib.logging.logger,
    Hooks = IonicAppLib.hooks;

shelljs.config.silent = true;

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function run(ionic) {
  this.ionic = ionic;

  var cmd = argv._[1];
  try {

    switch(cmd) {
      case 'add':
        Hooks.add(process.cwd());
        break;
      case 'remove':
        Hooks.remove(process.cwd());
        break;
      case 'perm':
      case 'permissions':
        Hooks.setHooksPermission(process.cwd());
        break;
      default:
        log.error('Please supply a command - either add or remove');
    }
  } catch (ex) {
    log.error('There was an error running the hooks command: ', ex.stack);
  }

};

exports.IonicTask = IonicTask;
