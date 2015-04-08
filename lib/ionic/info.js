var fs = require('fs'),
    path = require('path'),
    argv = require('optimist').argv,
    Task = require('./task').Task,
    ionicAppLib = require('ionic-app-lib'),
    Info = ionicAppLib.info,
    IonicStats = require('./stats').IonicStats;

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic) {
  this.ionic = ionic;

  try {

    var info = Info.gatherInfo();
    
    Info.getIonicVersion(info, process.cwd());
    Info.getIonicCliVersion(info, path.join(__dirname, '../../'));

    Info.printInfo(info);

    Info.checkRuntime();
  } catch (ex) {
    this.ionic.fail('There was an error retrieving your environment information:', ex);
  }

  IonicStats.t();
}

exports.IonicTask = IonicTask;
