var IonicTask = require('./task').IonicTask,
    IonicStats = require('./stats').IonicStats;

var IonicCordovaTask = function() {};

IonicCordovaTask.prototype = new IonicTask();

IonicCordovaTask.prototype.run = function(ionic) {
  var cmdName = process.argv[2].toLowerCase();
  var cmdArgs = (process.argv.length > 3 ? process.argv.slice(3) : []);

  // backwards compatibility prior to fully wrapping cordova cmds
  if(cmdName == 'platform') {
    // `ionic platform <PLATFORM>` used to actually run `ionic platform add <PLATFORM>`
    // if a cordova platform cmd isn't the cmd then automatically insert `add`
    var hasCordovaCmd = false;
    var validCommands = 'add remove rm list ls update up check'.split(' ');
    var cmdArg, x, y;
    for(x=0; x<cmdArgs.length; x++) {
      cmdArg = cmdArgs[x].toLowerCase();
      for(y=0; y<validCommands.length; y++) {
        if(cmdArg == validCommands[y]) {
          hasCordovaCmd = true;
          break;
        }
      }
    }
    if(!hasCordovaCmd) {
      cmdArgs.unshift('add');
    }
  }

  var command = 'cordova ' + cmdName + ' ' + cmdArgs.join(' ');

  if(exec(command).code !== 0) {
    return ionic.fail('Error from ' + cmdName + ' command.', cmdName);
  }

  IonicStats.t();
};

exports.IonicCordovaTask = IonicCordovaTask;
