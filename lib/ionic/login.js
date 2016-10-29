'use strict';

var chalk = require('chalk');
var extend = require('../utils/extend');
var IonicAppLib = require('ionic-app-lib');
var Login = IonicAppLib.login;
var log = IonicAppLib.logging.logger;
var prompt = require('prompt');
var Q = require('q');
var appLibSettings = IonicAppLib.settings;

var settings =  {
  title: 'login',
  name: 'login',
  summary: 'Login to your Ionic account',
  options: {
    '--email|-e': 'Ionic account email',
    '--password|-p': 'Ionic account password'
  },
  isProjectTask: false
};

function run(ionic, argv) {
  return login(argv);
}

// Login is set up a little differently than other tasks
// First of all - we need a way to prompt the user for email/pw
// Thats done with a prompt, so we handle that here instead of the lib
// Any other calls to login in the lib take email/pw to login
// The login task itself just runs LoginTask.login()

function login(argv) {
  var email = argv.email || argv.e || process.env.IONIC_EMAIL;
  var password = argv.password || argv.p || process.env.IONIC_PASSWORD;

  var promise;

  if (email && password) {
    promise = Q({ email: email, password: password });
  } else {
    promise = promptForLogin(argv);
  }

  return promise
  .then(function(loginInfo) {
    return Login.requestLogIn(loginInfo.email, loginInfo.password, true);
  })
  .then(function(cookieJar) {
    log.info(chalk.green('Logged in! :)'));
    return cookieJar;
  })
  .catch(function(ex) {
    log.error(ex);
  });
}

function promptForLogin(argv) {
  var q = Q.defer();

  var schema = [{
    name: 'email',
    pattern: /^[A-z0-9!#$%&'*+\/=?\^_{|}~\-]+(?:\.[A-z0-9!#$%&'*+\/=?\^_{|}~\-]+)*@(?:[A-z0-9](?:[A-z0-9\-]*[A-z0-9])?\.)+[A-z0-9](?:[A-z0-9\-]*[A-z0-9])?$/, // eslint-disable-line max-len
    description: chalk.yellow.bold('Email:'),
    required: true
  }, {
    name: 'password',
    description: chalk.yellow.bold('Password:'),
    hidden: true,
    required: true
  }];

  // prompt for log
  log.info(chalk.bold.green('\nTo continue, please login to your Ionic account.'));
  log.info(chalk.bold('Don\'t have one? Create one at: ') + chalk.bold(appLibSettings.IONIC_DASH + '/signup') + '\n');

  prompt.override = argv;
  prompt.message = '';
  prompt.delimiter = '';
  prompt.start();

  prompt.get(schema, function(err, result) {
    if (err) {
      return q.reject('Error logging in: ' + err);
    }

    q.resolve({ email: result.email, password: result.password });
  });

  return q.promise;
}

module.exports = extend(settings, {
  run: run,
  login: login,
  promptForLogin: promptForLogin
});
