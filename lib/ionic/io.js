'use strict';

var extend = Object.assign || require('util')._extend; // eslint-disable-line no-underscore-dangle
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
  summary: 'Integrate your app with the ionic.io platform services ' + '(alpha)'.red,
  args: {
    '<command>': 'init'.yellow
  }
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
