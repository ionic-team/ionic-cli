var fs = require('fs'),
  path = require('path'),
  parseUrl = require('url').parse,
  argv = require('optimist').argv,
  FormData = require('form-data'),
  IonicProject = require('./project'),
  IonicTask = require('./task').IonicTask,
  IonicStats = require('./stats').IonicStats,
  IonicLoginTask = require('./login').IonicLoginTask,
  IonicUploadTask = require('./upload').IonicUploadTask,
  Q = require('q');

var IonicDeployTask = function() {};

IonicDeployTask.prototype = new IonicTask();

IonicDeployTask.prototype.run = function(ionic) {
  var self = this;
  var project = IonicProject.load();

  self.ionic = ionic;

  self.note = argv._[1] || '';

  var login = new IonicLoginTask();
  login.get(ionic, function(jar) {
    self.jar = jar;
    IonicStats.t('upload', {});

    self.deploy();
  });
};

IonicDeployTask.prototype.deploy = function() {
  var self = this;
  var upload = new IonicUploadTask();

  upload.setNote(self.note);

  // So, the deploy task should upload the users app to the server with the standard upload task
  // and then we should ping the server in some manor to update the active version of the app
  upload.run(self.ionic);
};

exports.IonicVersionsTasks = IonicDeployTask;
