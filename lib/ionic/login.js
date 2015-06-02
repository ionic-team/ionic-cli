var fs = require('fs'),
    request = require('request'),
    argv = require('optimist').argv,
    prompt = require('prompt'),
    IonicAppLib = require('ionic-app-lib'),
    Login = IonicAppLib.login,
    settings = IonicAppLib.settings,
    IonicProject = require('./project'),
    IonicStats = require('./stats').IonicStats,
    IonicStore = require('./store').IonicStore,
    Q = require('q'),
    Task = require('./task').Task;

var LoginTask = module.exports;

//Login is set up a little differently than other tasks
//First of all - we need a way to prompt the user for email/pw
//Thats done with a prompt, so we handle that here instead of the lib
//Any other calls to login in the lib take email/pw to login
//The login task itself just runs LoginTask.login()

LoginTask.login = function login() {
  var email = argv.email || argv.e || process.env.IONIC_EMAIL;
  var password = argv.password || argv.p || process.env.IONIC_PASSWORD;

  var promise;

  if (email && password) {
    promise = Q({email: email, password: password});
  } else {
    promise = LoginTask.promptForLogin();
  }

  return promise
  .then(function(loginInfo) {
    return Login.requestLogIn(loginInfo.email, loginInfo.password, true);
  })
  .then(function(cookieJar) {
    console.log('Logged in! :)'.green);
    return cookieJar;
  })
  .catch(function(ex) {
    console.log('Error logging in');
    throw ex;
    // console.log(ex);
    // console.log(ex.stack);
  });
};

var IonicTask = function() {};

IonicTask.prototype = new Task();

LoginTask.promptForLogin = function promptForLogin() {
  var q = Q.defer();
  var self = this;

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
  console.log('Don\'t have one? Create a one at: '.bold + (settings.IONIC_DASH + '/signup').bold + '\n');

  prompt.override = argv;
  prompt.message = '';
  prompt.delimiter = '';
  prompt.start();

  prompt.get(schema, function (err, result) {
    if(err) {
      return q.reject('Error logging in: ' + err);
    }

    q.resolve({email: result.email, password: result.password});
  });

  return q.promise;
};

IonicTask.prototype.run = function(ionic, argv, callback) {

  var self = this;

  IonicStats.t();

  return LoginTask.login();

};

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

  this.run(ionic, argv, callback);
};

LoginTask.IonicTask = IonicTask;
