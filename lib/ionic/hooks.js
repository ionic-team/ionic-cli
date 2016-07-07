'use strict';

var extend = require('../utils/extend');
var shelljs = require('shelljs');
var IonicAppLib = require('ionic-app-lib');
var log = IonicAppLib.logging.logger;
var Hooks = IonicAppLib.hooks;

shelljs.config.silent = true;

var settings = {
  title: 'hooks',
  name: 'hooks',
  summary: 'Manage your Ionic Cordova hooks',
  args: {
    '[add|remove|permissions|perm]': 'Add, remove, or modify permissions on the default Ionic Cordova hooks'
  },
  isProjectTask: true
};

function run(ionic, argv) {
  var cmd = argv._[1];
  try {

    switch (cmd) {
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
}

module.exports = extend(settings, {
  run: run
});
