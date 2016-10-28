'use strict';

var chalk = require('chalk');
var extend = require('../utils/extend');
var LoginTask = require('./login');
var IonicAppLib = require('ionic-app-lib');
var IonicProject = IonicAppLib.project;
var Share = IonicAppLib.share;
var log = IonicAppLib.logging.logger;
var Login = IonicAppLib.login;
var appLibUtils = IonicAppLib.utils;

var settings = {
  title: 'share',
  name: 'share',
  summary: 'Share an app with a client, co-worker, friend, or customer',
  args: {
    '<EMAIL>': 'The email to share the app with'
  },
  isProjectTask: true
};

function run(ionic, argv) {
  var project;

  if (argv._.length < 2) {
    return appLibUtils.fail('Invalid command', 'share');
  }

  try {
    project = IonicProject.load();
  } catch (ex) {
    appLibUtils.fail(ex.message);
    return;
  }

  if (project.get('app_id') === '') {
    return appLibUtils.fail('You must first upload the app to share it');
  }

  var email = argv._[1];

  if (email.indexOf('@') < 0) {
    return appLibUtils.fail('Invalid email address', 'share');
  }

  log.info(chalk.green(['Sharing app ',
    project.get('name'), ' (', project.get('app_id'), ') with ', email, '.'].join('')));

  return Login.retrieveLogin()
  .then(function(jar) {
    if (!jar) {
      log.info('No previous login existed. Attempting to log in now.');
      return LoginTask.login(argv);
    }
    return jar;
  })
  .then(function(jar) {
    return Share.shareApp(process.cwd(), jar, email);
  })
  .catch(function(ex) {
    return appLibUtils.fail(ex);
  });
}

module.exports = extend(settings, {
  run: run
});
