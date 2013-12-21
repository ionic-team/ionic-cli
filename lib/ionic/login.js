var request = require('request'),
    argv = require('optimist').argv,
    prompt = require('prompt'),
    IonicTask = require('./task').IonicTask;

var IonicLoginTask = function() {
}

IonicLoginTask.HELP_LINE = 'Login to Ionic Studio';

IonicLoginTask.prototype = new IonicTask();

IonicLoginTask.prototype.run = function(ionic) {
  var schema = [{
  	name: 'password',
    hidden: true,
    required: true
  }];

  if(argv._.length >= 2) {
    // Grab the email for login
    this.email = argv._[1];
  } else {
  	schema.unshift({
  	  name: 'email',
	  pattern: /^\w+[@]\w+[\.]\w+$/, // Find a better email regex
	  message: 'Email for Ionic Studio login',
	  required: true
	});
  }

  prompt.start();

  prompt.get(schema, function (err, result) {
    console.log('Command-line input received:');
    console.log('  email: ' + result.email);
    console.log('  password: ' + result.password);
  });

  // this.password = this.ask("Password?", true);
  
};

exports.IonicLoginTask = IonicLoginTask;
