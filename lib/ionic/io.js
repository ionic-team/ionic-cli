'use strict';

var chalk = require('chalk');
var extend = require('../utils/extend');
var IonicAppLib = require('ionic-app-lib');
var ioLib = IonicAppLib.ioConfig;
var IonicProject = IonicAppLib.project;
var log = IonicAppLib.logging.logger;
var appLibUtils = IonicAppLib.utils;
var Login = IonicAppLib.login;
var LoginTask = require('./login');

var settings = {
  title: 'io',
  name: 'io',
  summary: 'Integrate your app with Ionic Cloud services',
  args: {
    '<command>': chalk.yellow('init')
  },
  isProjectTask: true
};

function run(ionic, argv) {

  try {
    IonicProject.load();
  } catch (ex) {
    appLibUtils.fail(ex.message);
    return;
  }

  return Login.retrieveLogin()
  .then(function(jar) {
    if (!jar) {
      log.info('No previous login existed. Attempting to log in now.');
      return LoginTask.login(argv);
    }
    return jar;
  })
  .then(function(jar) {
    if (argv['_'][1] === 'init') {
      ioLib.initIoPlatform(process.cwd(), jar);
    } else {
      appLibUtils.fail('Invalid command');
    }
  })
  .catch(function(ex) {
    return appLibUtils.fail(ex);
  });
}

module.exports = extend(settings, {
  run: run
});
