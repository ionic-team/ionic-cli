var IonicProject = require('./project'),
    IonicTask = require('./task').IonicTask,
    IonicStats = require('./stats').IonicStats;
    argv = require('optimist').argv,
    Task = require('./task').Task;

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic) {
  var self = this;

  self.ionic = ionic;

  var command = argv._[1];

  var task = self.ionic._getTaskWithName(command);

  if(!task) {
    console.log('Sorry .There is no "'.red.bold, command.cyan, '" command.'.red.bold)
    return
  }
  self.ionic._printIonic();
  process.stderr.write('\n=======================\n');


  self.ionic.printUsage(task);

  process.stderr.write('\n\n');


  // IonicStats.t();
}

exports.IonicTask = IonicTask;
