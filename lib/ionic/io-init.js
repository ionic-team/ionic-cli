var IonicAppLib = require('ionic-app-lib'),
    ioLib = IonicAppLib.ioConfig,
    argv = require('optimist').argv,
    prompt = require('prompt'),
    IonicProject = IonicAppLib.project,
    log = IonicAppLib.logging.logger,
    IonicTask = require('./task').IonicTask,
    Task = require('./task').Task,
    Login = IonicAppLib.login,
    LoginTask = require('./login'),
    Utils = require('./utils');

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic) {
  var self = this;
  self.ionic = ionic;

  self.project = null;

  try {
    self.project = IonicProject.load();
  } catch (ex) {
    self.ionic.fail(ex.message);
    return
  }

  Login.retrieveLogin()
  .then(function(jar){
    if (!jar) {
      log.info('No previous login existed. Attempting to log in now.');
      return LoginTask.login(argv);
    }
    return jar;
  })
  .then(function(jar) {
    if (argv['_'][1] == 'init') {
      ioLib.initIoPlatform(process.cwd(), jar);
    } else {
      self.ionic.fail("Invalid command");
    }
  })
  .catch(function(ex) {
    Utils.fail(ex);
  });
};

exports.IonicTask = IonicTask;
