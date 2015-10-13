var argv = require('optimist').argv,
    Task = require('./task').Task,
    IonicAppLib = require('ionic-app-lib'),
    IonicResources = IonicAppLib.resources,
    IonicStats = require('./stats').IonicStats,
    Utils = IonicAppLib.utils;

var Project = IonicAppLib.project;
var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function() {
  var dir = null,
      project = null;

  try {
    dir = process.cwd();
    project = Project.load(dir);
  } catch (ex) {
    return Utils.fail(ex, 'resources');
  }

  var options = argv;
  options.platforms = argv._;

  IonicResources.generate(dir, options)
    .catch(function(ex) {
      if (ex instanceof Error) {
        Utils.fail(ex, 'resources');
      }
    });

  IonicStats.t();
};

module.exports = {
  IonicTask: IonicTask
}
