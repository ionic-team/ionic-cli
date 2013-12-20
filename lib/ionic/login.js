var request = require('request'),
    shelljs = require('shelljs/global'),
    argv = require('optimist').argv,
    IonicTask = require('./task').IonicTask;

var IonicLoginTask = function() {
}

IonicLoginTask.HELP_LINE = 'Login to Ionic Studio';

IonicLoginTask.prototype = new IonicTask();

IonicLoginTask.prototype._printUsage = function() {
  process.stderr.write('ionic login [email]\n');
}

IonicLoginTask.prototype.run = function(ionic) {
  if(argv._.length >= 2) {
    // Grab the email for login
    this.email = argv._[1];
  } else {
  	this.email = this.ask("Email?");
  }

  this.password = this.ask("Password?", true);
  
};

exports.IonicLoginTask = IonicLoginTask;
