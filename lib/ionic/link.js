var fs = require('fs');
var path = require('path');
var argv = require('optimist').argv;
var IonicAppLib = require('ionic-app-lib');
var log = IonicAppLib.logging.logger;
var IonicProject = IonicAppLib.project;

function LinkTask() {}

LinkTask.prototype.run = function run(ionic) {
  this.ionic = ionic;

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
    this.setAppId('');
  } else {
    this.setAppId(argv._[1]);
  }

  log.info('Your Ionic App ID was set'.green);
};

LinkTask.prototype.setAppId = function setAppId(appId) {
  var project = null;

  try {
    project = IonicProject.load();
    project.set('app_id', appId);
    project.save();
  } catch (ex) {
    this.ionic.fail(ex.message);
    return;
  }
};

exports.IonicTask = LinkTask;
