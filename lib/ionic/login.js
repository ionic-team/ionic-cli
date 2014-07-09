var fs = require('fs'),
    request = require('request'),
    argv = require('optimist').argv,
    prompt = require('prompt'),
    IonicProject = require('./project'),
    IonicStore = require('./store').IonicStore,
    IonicTask = require('./task').IonicTask;

var IonicLoginTask = function() {};

IonicLoginTask.HELP_LINE = 'Login to the Ionic Platform';

IonicLoginTask.prototype = new IonicTask();

IonicLoginTask.prototype.run = function(ionic, callback) {
  var self = this;

  var schema = [{
    name: 'email',
    pattern: /^[A-z0-9!#$%&'*+\/=?\^_{|}~\-]+(?:\.[A-z0-9!#$%&'*+\/=?\^_{|}~\-]+)*@(?:[A-z0-9](?:[A-z0-9\-]*[A-z0-9])?\.)+[A-z0-9](?:[A-z0-9\-]*[A-z0-9])?$/,
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

  console.log('\nTo continue, please login to your Ionic account.'.bold.green);
  console.log('Don\'t have one? Create a one at: '.grey + (ionic.IONIC_DASH + '/signup').info.bold + '\n');

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

    var jar = request.jar();
    request({
      url: ionic.IONIC_DASH + '/login',
      jar: jar
    },
    function(err, response, body) {
      if(err || jar.cookies.length === 0) {
        ionic.fail('Error logging in: ' + err);
      }

      request({
        method: 'POST',
        url: ionic.IONIC_DASH + '/login',
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
          ionic.fail('Email or Password incorrect.  Please visit '+ ionic.IONIC_DASH +' for help.');
        }

        self.cookieData.set(ionic.IONIC_DASH, jar);
        self.cookieData.save();

        console.log('Logged in! :)'.green);

        if(callback) {
          callback(jar);
          project.set('email', self.email);
          project.save();
        }
      });
    });
  });
};

IonicLoginTask.prototype.get = function(ionic, callback) {
  this.cookieData = new IonicStore('cookies');
  var jar = this.cookieData.get(ionic.IONIC_DASH);

  if(jar && jar.cookies && jar.cookies.length) {
    for(var i in jar.cookies) {
      var cookie = jar.cookies[i];
      if(cookie.name == "sessionid" && new Date(cookie.expires) > new Date()) {
        callback(jar);
        return;
      }
    }
  }

  this.run(ionic, callback);
};

exports.IonicLoginTask = IonicLoginTask;
