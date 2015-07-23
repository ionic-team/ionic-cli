var IonicAppLib = require('ionic-app-lib'),
    IonicLoginTask = require('./login').IonicTask,
    IonicStats = require('./stats').IonicStats,
    Login = IonicAppLib.login,
    LoginTask = require('./login'),
    Task = require('./task').Task,
    Upload = IonicAppLib.upload,
    Utils = IonicAppLib.utils;

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function run(ionic, argv) {
  var note = argv.note;
  var deploy = argv.deploy || false;

  IonicStats.t();

  return Login.retrieveLogin()
  .then(function(jar){
    if (!jar) {
      console.log('No previous login existed. Attempting to log in now.');
      return LoginTask.login(argv);
    }
    return jar;
  })
  .then(function(jar) {
    return Upload.doUpload(process.cwd(), jar, note, deploy);
  })
  .catch(function(ex) {
    // console.log('Error', ex, ex.stack);
    Utils.fail(ex);
  });
};

exports.IonicTask = IonicTask;
