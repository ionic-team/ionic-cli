var IonicAppLib = require('ionic-app-lib');
var ioLib = IonicAppLib.ioConfig;
var argv = require('optimist').argv;
var IonicProject = IonicAppLib.project;
var log = IonicAppLib.logging.logger;
var Login = IonicAppLib.login;
var LoginTask = require('./login');
var Utils = require('./utils');

function IoInitTask() {}

IoInitTask.prototype.run = function(ionic) {
  var self = this;
  self.ionic = ionic;

  self.project = null;

  try {
    self.project = IonicProject.load();
  } catch (ex) {
    self.ionic.fail(ex.message);
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
      self.ionic.fail('Invalid command');
    }
  })
  .catch(function(ex) {
    Utils.fail(ex);
  });
};

exports.IonicTask = IoInitTask;
