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
  	  name: 'email',
	  pattern: /^\w+[@]\w+[\.]\w+$/, // Find a better email regex
	  message: 'Email for Ionic Studio login',
	  required: true
	}, {
  	name: 'password',
    hidden: true,
    required: true
  }];

  // Grab the email for login
  if(argv._.length >= 2) {
    this.email = argv._[1];
    schema.shift();
  } 

  // prompt.override = optimist.argv;

  prompt.start();

  prompt.get(schema, function (err, result) {
    console.log('Command-line input received:');
    console.log('  email: ' + result.email);
    console.log('  password: ' + result.password);
  });

  
};

exports.IonicLoginTask = IonicLoginTask;
