'use strict';

var _ = require('underscore');
var IonicAppLib = require('ionic-app-lib');
var ioLib = IonicAppLib.ioConfig;
var IonicProject = IonicAppLib.project;
var log = IonicAppLib.logging.logger;
var fail = IonicAppLib.utils.fail;
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
    fail(ex.message);
    return;
  }

  Login.retrieveLogin()
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
      fail('Invalid command');
    }
  })
  .catch(function(ex) {
    fail(ex);
  });
}

module.exports = _.extend(settings, {
  run: run
});
