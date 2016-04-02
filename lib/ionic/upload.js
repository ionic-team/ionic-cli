var IonicAppLib = require('ionic-app-lib'),
    IonicLoginTask = require('./login').IonicTask,
    Login = IonicAppLib.login,
    LoginTask = require('./login'),
    Task = require('./task').Task,
    Upload = IonicAppLib.upload,
    log = IonicAppLib.logging.logger,
    Utils = IonicAppLib.utils;

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function run(ionic, argv) {
  var note = argv.note;
  var deploy = argv.deploy || false;

  return Login.retrieveLogin()
  .then(function(jar){
    if (!jar) {
      log.info('No previous login existed. Attempting to log in now.');
      return LoginTask.login(argv);
    }
    return jar;
  })
  .then(function(jar) {
    return Upload.doUpload(process.cwd(), jar, note, deploy);
  })
  .catch(function(ex) {
    // log.info('Error', ex, ex.stack);
    Utils.fail(ex);
  });
};

exports.IonicTask = IonicTask;
