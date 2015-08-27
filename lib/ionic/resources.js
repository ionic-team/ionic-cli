var argv = require('optimist').argv,
    IonicAppLib = require('ionic-app-lib'),
    IonicResources = IonicAppLib.resources,
    IonicStats = require('./stats').IonicStats;

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
    return Utils.fail(ex, 'package');
  }

  var options = argv;
  options.platforms = argv._;

  IonicResources.generate(dir, options)
    .catch(console.error);

  IonicStats.t();
};

module.exports = {
  IonicTask: IonicTask
}
