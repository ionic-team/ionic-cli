var request = require('request'),
    shelljs = require('shelljs/global'),
    IonicTask = require('./task').IonicTask,
    argv = require('optimist').argv;

var IonicLoginTask = function() {
}

IonicLoginTask.HELP_LINE = 'Login to Ionic Studio';

IonicLoginTask.prototype = new IonicTask();

IonicLoginTask.prototype.run = function(ionic) {
  if(argv._.length >= 2) {
    // Grab the email for login
    this.email = argv._[1];
  } else {
  	// this.email = this.ask("Email?");
  }

  // this.password = this.ask("Password?", true);
  
};

exports.IonicLoginTask = IonicLoginTask;
