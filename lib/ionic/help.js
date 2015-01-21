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

  var command = argv._[1] ? argv._[1] : '';

  var task = self.ionic._getTaskWithName(command);

  if(command == '') {
    self.ionic._printHelpLines();
    return;
  }
  else if (!task) {
    console.log('Command not found.'.red.bold)
    return
  }

  self.ionic._printIonic();
  process.stderr.write('\n=======================\n');


  self.ionic.printUsage(task);

  process.stderr.write('\n\n');


  // IonicStats.t();
}

exports.IonicTask = IonicTask;
