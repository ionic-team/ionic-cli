// "cordovaPlatforms": [
//   "ios",
//   {
//     "android": {
//       "id": "android",
//       "locator": "https://github.com/apache/cordova-android.git"
//     }
//   }
// ],
// "cordovaPlugins": [
//   "org.apache.cordova.device",
//   "org.apache.cordova.console",
//   "com.ionic.keyboard",
//   "org.apache.cordova.splashscreen",
//   {
//     "locator": "https://github.com/MobileChromeApps/cordova-crosswalk-engine.git",
//     "id": "org.cordova.croswalk"
//   },
//   {
//     "locator": "/path/to/cloned/phonegap-facebook-plugin",
//     "id": "",
//     "variables": {
//         "APP_ID": "some_id",
//         "APP_NAME": "some_name"
//     }
//   }
// ]

var fs = require('fs'),
  path = require('path'),
  // argv = require('optimist').boolean(['plugins', 'platforms']).argv,
  Q = require('q'),
  shelljs = require('shelljs'),
  Task = require('./task').Task,
  IonicStats = require('./stats').IonicStats,
  _ = require('underscore'),
  IonicProject = require('./project'),
  IonicAppLib = require('ionic-app-lib'),
  State = IonicAppLib.state,
  Utils = IonicAppLib.utils,
  IonicInfo = IonicAppLib.info;

// var State = module.exports;

shelljs.config.silent = true;

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function run(ionic, argv) {
  var self = this,
      project,
      stats,
      projectPath,
      options = { platforms: true, plugins: true };

  this.ionic = ionic;

  try {
    projectPath = path.resolve('ionic.project');
    stats = fs.statSync(projectPath);
  } catch (ex) {
    this.ionic.fail('You cannot run any state commands on a project that is not an Ionic project.\nTry adding an ionic.project file or running ionic start to get an application to save or restore');
    return;
  }

  try {
    project = IonicProject.load();
  } catch (ex) {
    this.ionic.fail(ex.message);
    return;
  }

  //If either plugin or platforms is specified, set it to that value.
  if (argv.platforms || argv.plugins) {
    options = { platforms: argv.platforms, plugins: argv.plugins };
  }

  switch (argv._[1]) {
    case 'save':
      State.saveState(process.cwd(), options);
      break;
    case 'restore':
      State.restoreState(process.cwd(), options);
      break;
    case 'reset':
      State.resetState(process.cwd(), options);
      break;
    case 'clear':
      State.clearState(process.cwd(), options);
      break;
    default:
      console.log('Please specify a command [ save | restore | reset | clear ] for the state command.'.red.bold);
  }

  IonicStats.t();

};

exports.IonicTask = IonicTask;
