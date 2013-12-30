var fs = require('fs'),
    request = require('request'),
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
    if(err) {
      console.log(err);
      return;
    }

  	if(!_this.email) {
  		_this.email = result.email.toLowerCase();
  	}
  	_this.password = result.password;
  	
    // console.log('Command-line input received:');
    // console.log('  email: ' + _this.email);
    // console.log('  password: ' + _this.password);

    var jar = request.jar();
    console.log(_this.IONIC_DASH);
    request({url: _this.IONIC_DASH+'login', jar: jar}, function (err, response, body) {
      if(err || jar.cookies.length == 0) {
        console.log(err);
        return;
      }

      request({method: 'POST', url: _this.IONIC_DASH+'login', jar: jar, form: {username: _this.email, password: _this.password, csrfmiddlewaretoken: jar.cookies[0].value}}, function (err, response, body) { 
        if(err) {
          console.log(err);
          return;
        }
        // Should be a 304 redirect status code if correct
        if(response.statusCode == 200) {
          console.log('Email or Password incorrect.  Please visit '+_this.IONIC_DASH+' for help. :)')
          return;
        }
        
        fs.writeFile(_this.IONIC_COOKIES, JSON.stringify(jar, null, 2), function(err) {
          if(err) {
            console.log(err);
          } else {
            console.log('Logged in! :)');
          }
        });
        // console.log(response);
        
      });

    });

    
  });

  
};

exports.IonicLoginTask = IonicLoginTask;
