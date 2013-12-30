var request = require('request'),
    argv = require('optimist').argv,
    prompt = require('prompt'),
    IonicTask = require('./task').IonicTask;

var IonicLoginTask = function() {
}

IonicLoginTask.HELP_LINE = 'Login to Ionic Studio';

IonicLoginTask.prototype = new IonicTask();

IonicLoginTask.prototype.run = function(ionic) {
  var _this = this;
  var schema = [{
  	  name: 'email',
	  pattern: /^[A-z0-9!#$%&'*+\/=?^_{|}~-]+(?:\.[A-z0-9!#$%&'*+\/=?^_{|}~-]+)*@(?:[A-z0-9](?:[A-z0-9-]*[A-z0-9])?\.)+[A-z0-9](?:[A-z0-9-]*[A-z0-9])?$/,
	  message: 'Email for Ionic Studio login',
	  required: true
	}, {
  	  name: 'password',
      hidden: true,
      required: true
  }];

  // Grab the email for login
  if(argv._.length >= 2 && schema[0].pattern.test(argv._[1])) {
    this.email = argv._[1].toLowerCase();
    schema.shift();
  } 

  prompt.override = argv;

  prompt.start();

  prompt.get(schema, function (err, result) {
  	if(!_this.email) {
  		_this.email = result.email.toLowerCase();
  	}
  	_this.password = result.password;
  	
    console.log('Command-line input received:');
    console.log('  email: ' + _this.email);
    console.log('  password: ' + _this.password);

    var jar = request.jar();
    console.log(IonicTask.IONIC_DASH);
    // request({url: _this.IONIC_DASH+'login/', jar: jar}, function (error, response, body) {
    //   console.log(response);
    // });

    
  });

  
};

exports.IonicLoginTask = IonicLoginTask;
