var fs = require('fs'),
    path = require('path'),
    argv = require('optimist').argv,
    IonicProject = require('./project'),
    Task = require('./task').Task,
    IonicStats = require('./stats').IonicStats;

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function run(ionic) {
  this.ionic = ionic;
  var self = this;

  var ionicProjectFile = path.resolve('.', 'ionic.project');

  if(!fs.existsSync(ionicProjectFile)) {
    console.log('You cannot run this command unless you are in an Ionic Project folder'.red.bold)
    return
  }

  if(!argv._[1] && !argv.reset) {
    console.log('Please supply an Ionic App ID with this command or pass the --reset option'.red.bold);
    return
  }

  if(argv.reset || argv.r) {
    this.setAppId('')
  } else {
    this.setAppId(argv._[1]);  
  }

  console.log('Your Ionic App ID was set'.green)

}

IonicTask.prototype.setAppId = function setAppId(appId) {
  var project = null;

  try {
    project = IonicProject.load();
    project.set('app_id', appId);
    project.save();
  } catch (ex) {
    this.ionic.fail(ex.message);
    return
  }
}

exports.IonicTask = IonicTask;
