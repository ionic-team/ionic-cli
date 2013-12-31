var request = require('request'),
    shelljs = require('shelljs/global'),
    argv = require('optimist').argv,
    IonicTask = require('./task').IonicTask,
    IonicLoginTask = require('./login.js').IonicLoginTask;

var IonicBuildTask = function() {
}

IonicBuildTask.HELP_LINE = 'Build an Ionic project for the given plaform.';

IonicBuildTask.prototype = new IonicTask();

IonicBuildTask.prototype.run = function(ionic) {
  if(argv._.length < 2) {
    ionic.fail('No plaform specified, exiting.');
  }

  // Grab the name of the app
  this.platform = argv._[1];

  var login = new IonicLoginTask();
  login.get(ionic, function(jar) {
    console.log(jar);
  });
  
};

exports.IonicBuildTask = IonicBuildTask;
