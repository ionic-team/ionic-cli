var request = require('request'),
    shelljs = require('shelljs/global'),
    argv = require('optimist').argv,
    IonicTask = require('./task').IonicTask;

var IonicBuildTask = function() {
}

IonicBuildTask.HELP_LINE = 'Build an Ionic project for the given plaform.';

IonicBuildTask.prototype = new IonicTask();

IonicBuildTask.prototype._printUsage = function() {
  process.stderr.write('ionic build plaform (eg. android, ios)\n');
}

IonicBuildTask.prototype.run = function(ionic) {
  if(argv._.length < 2) {
    ionic.fail('No plaform specified, exiting.');
  }

  // Grab the name of the app
  this.platform = argv._[1];
};

exports.IonicBuildTask = IonicBuildTask;
