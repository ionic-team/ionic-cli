var fs = require('fs'),
    path = require('path'),
    cheerio = require('cheerio'),
    request = require('request'),
    parseUrl = require('url').parse,
    archiver = require('archiver'),
    argv = require('optimist').argv,
    FormData = require('form-data'),
    IonicProject = require('./project'),
    Task = require('./task').Task,
    IonicAppLib = require('ionic-app-lib'),
    Utils = IonicAppLib.utils,
    Login = IonicAppLib.login,
    LoginTask = require('./login'),
    Upload = IonicAppLib.upload,
    IonicStats = require('./stats').IonicStats,
    IonicLoginTask = require('./login').IonicTask,
    IonicUtils = require('./utils');

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function run(ionic, argv) {
  var note = argv.note;

  IonicStats.t();

  return Login.retrieveLogin()
  .then(function(jar){
    if (!jar) {
      console.log('No previous login existed. Attempting to log in now.');
      return LoginTask.login();
    }
    return jar;
  })
  .then(function(jar) {
    return Upload.doUpload(process.cwd(), jar, note);
  })
  .catch(function(ex) {
    // console.log('Error', ex, ex.stack);
    Utils.fail(ex);
  });
};

exports.IonicTask = IonicTask;
