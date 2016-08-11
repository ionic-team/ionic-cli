'use strict';

require('colors');

var extend = require('../utils/extend');
var Q = require('q');
var IonicAppLib = require('ionic-app-lib');
var appLibUtils = IonicAppLib.utils;
var log = IonicAppLib.logging.logger;
var appLibSetup = IonicAppLib.setup;

var settings = {
  title: 'setup',
  name: 'setup',
  summary: 'Configure the project with a build tool ' + '(beta)'.yellow,
  args: {
    '[sass]': 'Setup the project to use Sass CSS precompiling'
  },
  isProjectTask: true
}

function run(ionic, argv) {
  var taskName = argv._[1];
  if(!taskName) {
    appLibUtils.fail('Missing setup task command.', 'setup');
    return Q();
  }
  if (taskName !== 'sass') {
    appLibUtils.fail('Invalid setup task command: ' + taskName, 'setup');
    return Q();
  }

 return appLibSetup.sassSetup(process.cwd())
    .then(function() {
      log.info('Ionic setup complete'.green);
    })
    .catch(function(error) {
      log.error('Error from setup - ' + error);
    })
};

module.exports = extend(settings, {
  run: run
});
