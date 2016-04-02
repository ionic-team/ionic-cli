var path = require('path'),
    parseUrl = require('url').parse,
    shelljs = require('shelljs/global'),
    argv = require('optimist').boolean(['no-cordova', 'sass', 'list']).argv,
    Q = require('q'),
    FormData = require('form-data'),
    IonicProject = require('./project'),
    IonicStore = require('./store').IonicStore,
    Task = require('./task').Task,
    LoginTask = require('./login'),
    IonicAppLib = require('ionic-app-lib'),
    Share = IonicAppLib.share,
    log = IonicAppLib.logging.logger,
    Login = IonicAppLib.login,
    Utils = IonicAppLib.utils;

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic, argv) {
  var project;

  if(argv._.length < 2) {
    return ionic.fail('Invalid command', 'share');
  }

  try {
    project = IonicProject.load();
  } catch (ex) {
    ionic.fail(ex.message);
    return
  }

  if (project.get('app_id') == '') {
    return ionic.fail('You must first upload the app to share it');
  }

  var email = argv._[1];

  if(email.indexOf('@') < 0) {
    return ionic.fail('Invalid email address', 'share');
  }

  log.info(['Sharing app ', project.get('name'), ' (', project.get('app_id'), ') with ', email, '.'].join('').green);

  return Login.retrieveLogin()
  .then(function(jar){
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
    // log.info('Error', ex, ex.stack);
    return Utils.fail(ex);
  });
};

exports.IonicTask = IonicTask;
