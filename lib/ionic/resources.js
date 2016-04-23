var argv = require('optimist').argv;
var Task = require('./task').Task;
var IonicAppLib = require('ionic-app-lib');
var IonicResources = IonicAppLib.resources;
var IonicStats = require('./stats').IonicStats;
var Utils = IonicAppLib.utils;
var Project = IonicAppLib.project;

function IonicTask() {}

IonicTask.prototype = new Task();

IonicTask.prototype.run = function() {
  var dir = null;

  try {
    dir = process.cwd();
    Project.load(dir);
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
};
