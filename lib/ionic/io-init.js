var ioLib = require('ionic-app-lib').ioConfig,
    argv = require('optimist').argv,
    prompt = require('prompt'),
    IonicProject = require('./project'),
    IonicTask = require('./task').IonicTask,
    Task = require('./task').Task,
    Login = require('ionic-app-lib').login,
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
      console.log('No previous login existed. Attempting to log in now.');
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
    console.log('Error', ex, ex.stack);
    Utils.fail(ex);
  });
};

exports.IonicTask = IonicTask;
