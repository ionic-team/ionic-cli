var fs = require('fs'),
    request = require('request'),
    argv = require('optimist').argv,
    prompt = require('prompt'),
    IonicProject = require('./project'),
    IonicTask = require('./task').IonicTask;

var IonicLoginTask = function() {
}

IonicLoginTask.HELP_LINE = 'Login to the Ionic Platform';

IonicLoginTask.prototype = new IonicTask();

IonicLoginTask.prototype.run = function(ionic, callback) {
  var self = this;
  var schema = [{
    name: 'email',
    pattern: /^[A-z0-9!#$%&'*+\/=?^_{|}~-]+(?:\.[A-z0-9!#$%&'*+\/=?^_{|}~-]+)*@(?:[A-z0-9](?:[A-z0-9-]*[A-z0-9])?\.)+[A-z0-9](?:[A-z0-9-]*[A-z0-9])?$/,
    message: 'Email for your Ionic Platform login',
    required: true
  }, {
    name: 'password',
    hidden: true,
    required: true
  }];

  var project = IonicProject.load();

  // Grab the email for login
  if(argv._.length >= 2 && schema[0].pattern.test(argv._[1])) {
    this.email = argv._[1].toLowerCase();
    schema.shift();
  } 
  // Assume project email is login email if it exists
  else if(project.get('email')) {
    this.email = project.get('email');
    schema.shift();
  }

  console.log('To continue, please login to your Ionic account.\nDon\'t have one? Create a one here: ' + (ionic.IONIC_DASH + 'signup').info.bold + '\n');

  prompt.override = argv;

  prompt.start();


  prompt.get(schema, function (err, result) {
    if(err) {
      ionic.fail('Error logging in: ' + err);
    }

    if(!self.email) {
      self.email = result.email.toLowerCase();
    }
    self.password = result.password;

    if(!project.get('email')) {
      project.set('email');
    }
    
    var jar = request.jar();
    request({
      url: ionic.IONIC_DASH + 'login',
      jar: jar
    }, 
    function(err, response, body) {
      if(err || jar.cookies.length == 0) {
        ionic.fail('Error logging in: ' + err);
      }

      request({
        method: 'POST',
        url: ionic.IONIC_DASH + 'login', 
        jar: jar, 
        form: {
          username: self.email,
          password: self.password,
          csrfmiddlewaretoken: jar.cookies[0].value
        }
      },
      function (err, response, body) { 
        if(err) {
          ionic.fail('Error logging in: ' + err);
        }
        // Should be a 304 redirect status code if correct
        if(response.statusCode == 200) {
          ionic.fail('Email or Password incorrect.  Please visit '+ ionic.IONIC_DASH +' for help.')
        }
        
        var err = fs.writeFileSync(ionic.IONIC_COOKIES, JSON.stringify(jar, null, 2));
        if(err) {
          ionic.fail('Error writing ' + ionic.IONIC_COOKIES + ': ' + err);
        }
        
        console.log('Logged in! :)');

        if(callback) {
          callback(jar);
        }
      });
    });
  });
};

IonicLoginTask.prototype.get = function(ionic, callback) {
  var self = this;

  if(fs.existsSync(ionic.IONIC_COOKIES)) {
    var jar = JSON.parse(fs.readFileSync(ionic.IONIC_COOKIES));
    if(jar.cookies && jar.cookies.length > 0) {
      for(i in jar.cookies) {
        var cookie = jar.cookies[i];
        if(cookie.name == "sessionid" && new Date(cookie.expires) > new Date()) {
          callback(jar);
          return;
        }
      }
    }
  }

  this.run(ionic, callback);
}

exports.IonicLoginTask = IonicLoginTask;
