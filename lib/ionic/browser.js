//Cross walk process

//See the cordova-engine-crosswalk plugin for how to install the browser as a plugin
//https://github.com/MobileChromeApps/cordova-crosswalk-engine

//Find CrossWalk webviews here:
//https://download.01.org/crosswalk/releases/crosswalk/android/stable/

//Download the release for cordova-crosswalk-engine
//Download the release for cordova-android with crosswalk
//Ensure Android API 19 is installed
//Run ionic platform rm android
//Run ionic platform add ./engine/cordova-android-crosswalk
//Run ionic plugin add ./engine/cordova-crosswalk-engine
//Run android update project on android file
//Run project - cordova run android BUILD_MULTIPLE_APKS=true

var argv = require('optimist').argv,
    Task = require('./task').Task,
    IonicStats = require('./stats').IonicStats,
    _ = require('underscore'),
    IonicProject = require('./project'),
    IonicAppLib = require('ionic-app-lib'),
    Info = IonicAppLib.info,
    Browser = IonicAppLib.browser;

var IonicTask = function() {};
IonicTask.prototype = new Task();

IonicTask.prototype.run = function run(ionic) {
  try {
    var self = this;
    this.ionic = ionic;

    if(!Info.checkRuntime()) {
      console.log('\nPlease update your runtime environment before running the browser command');
      return
    }

    if(argv._.length < 2) {
      return this.ionic.fail('Invalid command usage', 'browser');
    }

    var cmdArg, x, y, hasValidCmd = false;

    cmdArg = argv._[1]

    var validCommands = 'add remove rm list ls revert versions clean upgrade'.split(' ');
    for(y=0; y<validCommands.length; y++) {
      if(cmdArg == validCommands[y]) {
        hasValidCmd = true;
        break;
      }
    }

    if(!hasValidCmd) {
      return this.ionic.fail('You did not supply a valid command', 'browser');
    }

    var appDirectory = process.cwd();
    var platform = argv._[2],
        browserToInstall = argv._[2];

    var dontSavePlatformsPlugins = !(argv.nosave || argv.n);

    switch(cmdArg) {
      case 'add':
        Browser.addBrowser(appDirectory, browserToInstall, dontSavePlatformsPlugins);
        break;
      case 'clean':
        Browser.clean(appDirectory);
        break;
      case 'remove':
      case 'rm':
        Browser.removeBrowser(appDirectory, browserToInstall);
        break;
      case 'revert':
        Browser.revertBrowser(appDirectory, platform);
        break;
      case 'list':
      case 'ls':
        Browser.listBrowsers(appDirectory);
        break;
      case 'upgrade':
        Browser.upgradeCrosswalk(appDirectory);
        break;
      case 'update':
      case 'up':
        Browser.addBrowser(appDirectory);
        break;
      case 'check':
        console.log('Checking for engine');
        break;
      case 'info':
      case 'versions':
        Browser.listInstalledBrowsers(appDirectory);
    }

    IonicStats.t();
  } catch (ex) {
    console.log(ex.stack);
    console.log('Exception:', ex);
  }

};

exports.IonicTask = IonicTask;
