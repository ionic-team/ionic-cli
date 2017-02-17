'use strict';

var chalk = require('chalk');
var extend = require('../utils/extend');
var IonicAppLib = require('ionic-app-lib');
var ioLib = IonicAppLib.ioConfig;
var IonicProject = IonicAppLib.project;
var appLibUtils = IonicAppLib.utils;

var settings = {
  title: 'config',
  name: 'config',
  summary: 'Set configuration variables for your ionic app',
  args: {
    '<command>': chalk.yellow('set') + ', ' +
      chalk.yellow('unset') + ', ' + chalk.yellow('build') + ', or ' + chalk.yellow('info'),
    '[key]': 'The key to set',
    '[value]': 'The value to set'
  },
  isProjectTask: true
};

function run(ionic, argv) {

  try {
    IonicProject.load();
  } catch (ex) {
    return appLibUtils.fail(ex.message);
  }

  var set = false;
  var key = '';
  var val = '';

  switch (argv['_'][1]) {
  case 'build':
    return ioLib.writeIoConfig(false, false, true);
  case 'info':
    return ioLib.listConfig();
  case 'set':
  case 'unset':
    if (!argv['_'][2]) {
      return appLibUtils.fail("Invalid syntax, use 'ionic config <command> key value'");
    }
    set = argv['_'][1] === 'set';
    key = argv['_'][2];
    if (argv['_'][3] && set) {
      val = argv['_'][3];
    }
    ioLib.writeIoConfig(key, val, set);
    break;
  default:
    return appLibUtils.fail("Invalid command, must use 'set', 'unset', 'build', or 'info'");
  }
}

module.exports = extend(settings, {
  run: run
});
