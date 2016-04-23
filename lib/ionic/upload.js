var IonicAppLib = require('ionic-app-lib');
var Login = IonicAppLib.login;
var LoginTask = require('./login');
var Task = require('./task').Task;
var Upload = IonicAppLib.upload;
var log = IonicAppLib.logging.logger;
var Utils = IonicAppLib.utils;

function IonicTask() {}

IonicTask.prototype = new Task();

IonicTask.prototype.run = function run(ionic, argv) {
  var note = argv.note;
  var deploy = argv.deploy || false;

  return Login.retrieveLogin()
  .then(function(jar) {
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
