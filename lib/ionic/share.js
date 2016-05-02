require('shelljs/global');

var IonicAppLib = require('ionic-app-lib');
var IonicProject = IonicAppLib.project;
var Task = require('./task').Task;
var LoginTask = require('./login');
var Share = IonicAppLib.share;
var log = IonicAppLib.logging.logger;
var Login = IonicAppLib.login;
var Utils = IonicAppLib.utils;

function IonicTask() {}

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic, argv) {
  var project;

  if (argv._.length < 2) {
    return ionic.fail('Invalid command', 'share');
  }

  try {
    project = IonicProject.load();
  } catch (ex) {
    ionic.fail(ex.message);
    return;
  }

  if (project.get('app_id') === '') {
    return ionic.fail('You must first upload the app to share it');
  }

  var email = argv._[1];

  if (email.indexOf('@') < 0) {
    return ionic.fail('Invalid email address', 'share');
  }

  log.info(['Sharing app ', project.get('name'), ' (', project.get('app_id'), ') with ', email, '.'].join('').green);

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
    return Utils.fail(ex);
  });
};

exports.IonicTask = IonicTask;
