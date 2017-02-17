'use strict';

var chalk = require('chalk');
var extend = require('../utils/extend');
var fs = require('fs');
var path = require('path');
var IonicAppLib = require('ionic-app-lib');
var log = IonicAppLib.logging.logger;
var fail = IonicAppLib.utils.fail;
var IonicProject = IonicAppLib.project;

var settings = {
  title: 'link',
  name: 'link',
  summary: 'Sets your Ionic App ID for your project',
  args: {
    '[appId]': 'The app ID you wish to set for this project'
  },
  options: {
    '--reset|-r': {
      title: 'This will reset the Ionic App ID',
      boolean: true
    }
  },
  isProjectTask: true
};

function run(ionic, argv) {
  var ionicProjectFile = path.resolve('.', 'ionic.project');

  if (!fs.existsSync(ionicProjectFile)) {
    log.error('You cannot run this command unless you are in an Ionic Project folder');
    return;
  }

  if (!argv._[1] && !argv.reset) {
    log.error('Please supply an Ionic App ID with this command or pass the --reset option');
    return;
  }

  if (argv.reset || argv.r) {
    setAppId(ionic, '');
  } else {
    setAppId(ionic, argv._[1]);
  }

  log.info(chalk.green('Your Ionic App ID was set'));
}

function setAppId(ionic, appId) {
  var project = null;

  try {
    project = IonicProject.load();
    project.set('app_id', appId);
    project.save();
  } catch (ex) {
    fail(ex.message);
    return;
  }
}

module.exports = extend(settings, {
  run: run,
  setAppId: setAppId
});
