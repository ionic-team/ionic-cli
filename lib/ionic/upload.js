'use strict';

var extend = require('../utils/extend');
var IonicAppLib = require('ionic-app-lib');
var Login = IonicAppLib.login;
var LoginTask = require('./login');
var Upload = IonicAppLib.upload;
var log = IonicAppLib.logging.logger;
var appLibUtils = IonicAppLib.utils;

var settings = {
  title: 'upload',
  name: 'upload',
  summary: 'Upload an app to your Ionic account',
  options: {
    '--email|-e': 'Ionic account email',
    '--password|-p': 'Ionic account password',
    '--note': 'The note to signify the upload',
    '--deploy <channel_tag>': 'Deploys the upload to the given channel. Defaults to the Dev channel'
  },
  isProjectTask: true
};

function run(ionic, argv) {
  var note = argv.note;
  var deploy = argv.deploy || false;

  return Login.retrieveLogin()
  .then(function(jar) {
    if (!jar) {
      log.info('No previous login existed. Attempting to log in now.');
      return LoginTask.login(argv);
    }
    return jar;
  })
  .then(function(jar) {
    return Upload.doUpload(process.cwd(), jar, note, deploy);
  })
  .catch(function(ex) {
    appLibUtils.fail(ex);
  });
}

module.exports = extend(settings, {
  run: run
});
