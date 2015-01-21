var fs = require('fs'),
    request = require('request'),
    argv = require('optimist').argv,
    prompt = require('prompt'),
    IonicProject = require('./project'),
    IonicStore = require('./store').IonicStore,
    Task = require('./task').Task;

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.get = function(ionic, callback) {
  this.cookieData = new IonicStore('cookies');

  if(ionic.jar) {
    // already in memory
    callback(ionic.jar);
    return;
  }

  this.email = argv.email || argv.e || process.env.IONIC_EMAIL;
  this.password = argv.password || argv.p || process.env.IONIC_PASSWORD;

  if(!this.email && this.password) {
    return ionic.fail('--email or -e command line flag, or IONIC_EMAIL environment variable required');
  }
  if(this.email && !this.password) {
    return ionic.fail('--password or -p command line flag, or IONIC_PASSWORD environment variable required');
  }

  if(!this.email && !this.password) {
    // did not include cmd line flags, check for existing cookies
    var jar = this.cookieData.get(ionic.IONIC_DASH);

    if(jar && jar.length) {
      for(var i in jar) {
        var cookie = jar[i];
        if(cookie.key == "sessionid" && new Date(cookie.expires) > new Date()) {
          ionic.jar = jar;
          callback(jar);
          return;
        }
      }
    }
  }

  this.run(ionic, callback);
};

IonicTask.prototype.run = function(ionic, callback) {
  var self = this;

  if(!this.email && !this.password) {

    var schema = [{
      name: 'email',
      pattern: /^[A-z0-9!#$%&'*+\/=?\^_{|}~\-]+(?:\.[A-z0-9!#$%&'*+\/=?\^_{|}~\-]+)*@(?:[A-z0-9](?:[A-z0-9\-]*[A-z0-9])?\.)+[A-z0-9](?:[A-z0-9\-]*[A-z0-9])?$/,
      description: 'Email:'.yellow.bold,
      required: true
    }, {
      name: 'password',
      description: 'Password:'.yellow.bold,
      hidden: true,
      required: true
    }];

    // prompt for log
    console.log('\nTo continue, please login to your Ionic account.'.bold.green);
    console.log('Don\'t have one? Create a one at: '.bold + (ionic.IONIC_DASH + '/signup').bold + '\n');

    prompt.override = argv;
    prompt.message = '';
    prompt.delimiter = '';
    prompt.start();

    prompt.get(schema, function (err, result) {
      if(err) {
        return ionic.fail('Error logging in: ' + err);
      }

      self.email = result.email;
      self.password = result.password;

      self.requestLogIn(ionic, callback, true);
    });

  } else {
    // cmd line flag were added, use those instead of a prompt
    self.requestLogIn(ionic, callback, false);
  }

};

IonicTask.prototype.requestLogIn = function(ionic, callback, saveCookies) {
  var self = this;

  var jar = request.jar();
  request({
    method: 'POST',
    url: ionic.IONIC_DASH + ionic.IONIC_API + 'user/login',
    jar: jar,
    form: {
      username: self.email.toString().toLowerCase(),
      password: self.password
    },
    proxy: process.env.PROXY || process.env.http_proxy || null
  },
  function (err, response, body) {
    if(err) {
      return ionic.fail('Error logging in: ' + err);
    }

    // Should be a 302 redirect status code if correct
    if(response.statusCode != 200) {
      return ionic.fail('Email or Password incorrect. Please visit '+ ionic.IONIC_DASH.white +' for help.'.red);
    }

    if(saveCookies) {
      // save cookies
      if(!self.cookieData) {
        self.cookieData = new IonicStore('cookies');
      }
      self.cookieData.set(ionic.IONIC_DASH, jar.getCookies(ionic.IONIC_DASH));
      self.cookieData.save();
    }

    // save in memory
    ionic.jar = jar;

    console.log('Logged in! :)'.green);

    if(callback) {
      callback(jar);
    }
  });
};

exports.IonicTask = IonicTask;
