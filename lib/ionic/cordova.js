var IonicTask = require('./task').IonicTask,
    IonicStats = require('./stats').IonicStats;

var IonicCordovaTask = function() {};

IonicCordovaTask.prototype = new IonicTask();

IonicCordovaTask.prototype.run = function(ionic) {
  var cmdName = process.argv[2].toLowerCase();
  var cmdArgs = (process.argv.length > 3 ? process.argv.slice(3) : []);

  var command = 'cordova ' + cmdName + ' ' + cmdArgs.join(' ');

  if(exec(command).code !== 0) {
    return ionic.fail('Error from ' + cmdName + ' command.', cmdName);
  }

  IonicStats.t();
};

exports.IonicCordovaTask = IonicCordovaTask;
