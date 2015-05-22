var Task = require('./task').Task,
    IonicStats = require('./stats').IonicStats,
    fs = require('fs'),
    path = require('path'),
    argv = require('optimist').argv,
    exec = require('child_process').exec,
    Q = require('q'),
    IonicProject = require('./project'),
    IonicAppLib = require('ionic-app-lib'),
    Setup = IonicAppLib.setup,
    Utils = IonicAppLib.utils,
    colors = require('colors');

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic) {
  if( argv._.length < 2 ) {
    return ionic.fail('Missing setup task command.', 'setup');
  }

  var self = this;
  var tasks = argv._.slice(1);
  var promises = [];

  var promise = Q();

  for (var x = 0; x < tasks.length; x++) {
    try {
      (function() {
        //create closure for task
        var task = self.runSetupTask(tasks[x]);
        // console.log('Task: ', task);
        promises.push(task);
      })();
    } catch (ex) {

    }
  }

  promises.forEach(function(task) {
    // console.log('Task foreach:', task);
    promise = promise.then(function(){ return task(process.cwd()); });
  });

  promise
  .fin(function() {
    console.log('Ionic setup complete'.green.bold);
  })
  .catch(function(error) {
    console.log('Error from setup - ' + error);
  })

  IonicStats.t();
};

IonicTask.prototype.runSetupTask = function runSetupTask(setupTask) {
  switch (setupTask) {
    case 'sass':
      return Setup.sassSetup;
      break;
    case 'facebook':
      return Setup.setupFacebook;
      break;
    default:
      var errorMessage = 'Invalid setup task command: ' + setupTask;
      console.log(errorMessage);
      return Q(errorMessage);
  }
};

exports.IonicTask = IonicTask;
