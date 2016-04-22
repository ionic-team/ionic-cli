var argv = require('optimist').argv;
var Task = require('./task').Task;

function IonicTask() {}

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic) {

  // var self = this;

  // self.ionic = ionic;

  var command = argv._[1] ? argv._[1] : '';

  var task = ionic.getTaskWithName(command);

  if (command === '') {
    ionic.printHelpLines();
    return;
  } else if (!task) {
    console.log('Command not found.'.red.bold);
    return;
  }

  ionic.printIonic();
  process.stderr.write('\n=======================\n');

  ionic.printUsage(task);

  process.stderr.write('\n\n');
};

exports.IonicTask = IonicTask;
