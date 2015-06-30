var path = require('path'),
    parseUrl = require('url').parse,
    shelljs = require('shelljs/global'),
    argv = require('optimist').boolean(['no-cordova', 'sass', 'list']).argv,
    Q = require('q'),
    open = require('open'),
    xml2js = require('xml2js'),
    FormData = require('form-data'),
    IonicProject = require('./project'),
    IonicStore = require('./store').IonicStore,
    Task = require('./task').Task,
    IonicStats = require('./stats').IonicStats,
    LoginTask = require('./login'),
    IonicAppLib = require('ionic-app-lib'),
    Share = IonicAppLib.share,
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
  
  var email = argv._[1];

  if(email.indexOf('@') < 0) {
    return ionic.fail('Invalid email address', 'share');
  }

  console.log('Sharing app', project.get('app_id'), 'with', email);

  IonicStats.t();

  return Login.retrieveLogin()
  .then(function(jar){
    if (!jar) {
      console.log('No previous login existed. Attempting to log in now.');
      return LoginTask.login();
    }
    return jar;
  })
  .then(function(jar) {
    return Share.shareApp(process.cwd(), jar, email);
  })
  .catch(function(ex) {
    // console.log('Error', ex, ex.stack);
    Utils.fail(ex);
  });
};

exports.IonicTask = IonicTask;
