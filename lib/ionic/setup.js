var Task = require('./task').Task;

function IonicTask() {}

IonicTask.prototype = new Task();

IonicTask.prototype.run = function() {

  // TODO link to gulp hook docs
  console.log('The setup task has been deprecated.\n');
};

exports.IonicTask = IonicTask;
