//Cross walk process

//See the cordova-engine-crosswalk plugin for how to install the browser as a plugin
//https://github.com/MobileChromeApps/cordova-crosswalk-engine

//Find CrossWalk webviews here:
//https://download.01.org/crosswalk/releases/crosswalk/android/stable/

//Download the release for cordova-crosswalk-engine
//Download the release for cordova-android with crosswalk
//Ensure Android API 19 is installed
//Run cordova platform rm android
//Run cordova platform add ./engine/cordova-android-crosswalk
//Run cordova plugin add ./engine/cordova-crosswalk-engine
//Run android update project on android file
//Run project - cordova run android BUILD_MULTIPLE_APKS=true

var fs = require('fs'),
    path = require('path'),
    argv = require('optimist').argv,
    request = require('request'),
    Q = require('q'),
    shelljs = require('shelljs'),
    Task = require('./task').Task,
    proxyMiddleware = require('proxy-middleware'),
    unzip = require('unzip'),
    Ionic = require('../ionic').Ionic,
    IonicStats = require('./stats').IonicStats;

  var config = shelljs.config;
  config.silent = true;

var iosBrowsers = [
    {
      platform: 'iOS',
      name: 'WKWebView',
      available: false,
      command: 'ionic browser add wkwebview'
    },
    {
      platform: 'iOS',
      name: 'UIWebView',
      available: false,
      command: 'ionic browser revert ios'
    }
  ],
  androidBrowsers = [
    {
      platform: 'Android',
      name: 'Crosswalk',
      available: true,
      command: 'ionic browser add crosswalk'
    },
    {
      platform: 'Android',
      name: 'Browser (default)',
      available: true,
      command: 'ionic browser revert android'
    },
    {
      platform: 'Android',
      name: 'GeckoView',
      available: false,
      command: 'ionic browser add geckoview'
    }
  ];

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.getCordovaCrosswalkEngine = function getCordovaCrosswalkEngine() {
  var q = Q.defer();

  if(!fs.existsSync(path.join(process.cwd(), 'engine'))) {
    shelljs.mkdir(path.join(process.cwd(), 'engine'));
  }

  if(fs.existsSync(path.join(process.cwd(), 'engine', 'cordova-crosswalk-engine'))) {
    q.resolve();
    return q.promise;
  }

  var downloadUrl = 'https://github.com/driftyco/cordova-crosswalk-engine/archive/v0.8.zip';

  var tempZipFilePath = path.join(process.cwd(), 'engine', 'cordova-crosswalk-engine.zip');
  var zipOutPath = path.join(process.cwd(), 'engine');

  Ionic.fetchArchive(zipOutPath, downloadUrl)
  .then(function(data) {
    q.resolve();
  }, function(error) {
    console.log('Failed to download cordova-crosswalk-engine - ', error);
    q.reject();
  })

  return q.promise;
}

IonicTask.prototype.getAndroidRuntimes = function getAndroidRuntimes() {
  var command = 'echo "y" | android update sdk --no-ui --all --filter 10';
  var result = shelljs.exec(command, { silent: true } );

  if(result.code != 0) {
    console.log('error!');
  }
}

function downloadCrosswalkWebview(architecture, version) {
  var q = Q.defer();

  var downloadUrl = 'https://download.01.org/crosswalk/releases/crosswalk/android/stable/' +
    version + '/' + architecture + '/crosswalk-webview-' + version + '-' + architecture + '.zip';

  var tempZipFilePath = path.join(process.cwd(), 'engine', 'xwalk-webviews', architecture);

  if (!fs.existsSync(path.join(process.cwd(), 'engine', 'xwalk-webviews'))) {
    shelljs.mkdir(path.join(process.cwd(), 'engine', 'xwalk-webviews'));
  }

  Ionic.fetchArchive(tempZipFilePath, downloadUrl)
  .then(function(data) {
    //Need to go copy to android directory.
    var fileName = fs.readdirSync(tempZipFilePath);

    var copySource = path.join(tempZipFilePath, fileName[0], '*');

    var copyDestination = path.join(process.cwd(), 'engine', 'cordova-crosswalk-engine-0.8', 'libs', 'xwalk_core_library', '/');

    var cpResult = shelljs.cp('-R', copySource, copyDestination);

    q.resolve(data);
  }, function(error) {
    console.log('Crosswalk webviews failed to download - ', error)
    q.reject(error);
  })

  return q.promise;
}

IonicTask.prototype.getCrosswalkWebviews = function getCrosswalkWebviews() {
  var version = '8.37.189.14';

  var armPromise = downloadCrosswalkWebview('arm', version);
  var x86Promise = downloadCrosswalkWebview('x86', version);

  return Q.all([armPromise, x86Promise]);
}

IonicTask.prototype.downloadCordova40x = function downloadCordova40x() {
  var q = Q.defer();

  var downloadUrl = 'https://github.com/driftyco/cordova-android/archive/crosswalk.zip';

  var tempZipFilePath = path.join(process.cwd(), 'engine');

  Ionic.fetchArchive(tempZipFilePath, downloadUrl)
  .then(function(data) {
    console.log('\nFinished downloading cordova-android v4.0.x');
    //Need to make certain files executable
    var cordovaAndroid4Path = path.join(tempZipFilePath, 'cordova-android-crosswalk', 'bin');
    var android4BinPath = path.join(cordovaAndroid4Path, 'templates', 'cordova');
    shelljs.chmod('+x', path.join(cordovaAndroid4Path, '*'));
    shelljs.chmod('+x', path.join(android4BinPath, '*'))
    console.log('\nAltered permissions for Android Paths')
    q.resolve();
  }, function(error) {
    console.log('Failed to download cordova-android v4.0.x ', error);
    q.reject();
  })

  return q.promise;
}

IonicTask.prototype.removeAndroidProject = function removeAndroidProject() {
  var command = 'cordova platform remove android';
  var result = shelljs.exec(command);
  console.log('\nRemoved old Cordova Android platform')
}

IonicTask.prototype.addCordova40xProject = function addCordova40xProject() {
  var command =  'cordova platform add ./engine/cordova-android-crosswalk/';
  var result = shelljs.exec(command);
  console.log('\nAdded Cordova Android 4.0')
}

IonicTask.prototype.addCrosswalkPlugin = function addCrosswalkPlugin() {
  var command = 'cordova plugin add ./engine/cordova-crosswalk-engine-0.8';
  var result = shelljs.exec(command);
  console.log('\nAdded Crosswalk Webview Engine')
}

IonicTask.prototype.updateAndroidProject = function updateAndroidProject() {
  var xwalkLibraryPath = path.join(process.cwd(), 'engine', 'cordova-crosswalk-engine-0.8', 'libs', 'xwalk_core_library');

  shelljs.cd(path.join(process.cwd(), 'platforms', 'android'));

  shelljs.exec('android update lib-project --path "' + xwalkLibraryPath + '" --target "4"', {silent: true});

  shelljs.cd('../../');
}

IonicTask.prototype.downloadFiles = function downloadFiles() {
  var q = Q.defer();

  var self = this;
  this.getCordovaCrosswalkEngine()
  .then(function(data) {
    console.log('\nDownloaded cordova-crosswalk-engine');
    return self.downloadCordova40x();
  })
  .then(function(data) {
    console.log('\nDownloaded Cordova Android for Crosswalk');
    return self.getCrosswalkWebviews();
  })
  .then(function(data) {
    console.log('\nDownloaded Crosswalk webviews');
    return self.getAndroidRuntimes();
  })
  .then(function(data) {
    console.log('\nDownloaded Android runtime (API 19)');
    q.resolve();
  }, function(error) {
    q.reject();
  })
  .catch(function(error){
    q.reject(error);
  })

  return q.promise;
}

IonicTask.prototype.removeCrosswalk = function() {
  shelljs.exec('cordova plugin rm org.apache.cordova.engine.crosswalk')
  shelljs.exec('cordova platform rm android')
  shelljs.exec('cordova platform add android')
}

IonicTask.prototype.installCrosswalk = function() {
  var self = this;

  self.downloadFiles()
  .then(function(data) {
    self.removeAndroidProject();
    self.addCordova40xProject();
    self.addCrosswalkPlugin();
    self.updateAndroidProject();

    console.log('\nIonic Browser Add completed for Crosswalk');
  })
  .catch(function(error){
    console.log('An error with adding Crosswalk browser occured')
    console.log(error)
  })
}

IonicTask.prototype.revertBrowser = function() {
  var self = this;

  var platform = argv._[2];

  if (!platform) {
    console.log('You did not specify a platform to revert the browser');
    return;
  }

  console.log('Reverting', platform, 'browser');

  var addCommand = ['cordova platform add', platform].join(' ');
  var rmCommand = ['cordova platform rm', platform].join(' ');

  shelljs.exec(rmCommand)
  shelljs.exec(addCommand)

  console.log('Reverted', platform, 'browser');
}

IonicTask.prototype.addBrowser = function() {
  var self = this;

  //Check which browser they wish to install
  var browserToInstall = 'crosswalk';
  if (argv._[2]) {
    browserToInstall = argv._[2];
  } else {
    console.log('No browser specified. Nothing to do here.'.red.bold)
    return;
  }

  switch(browserToInstall) {
    case 'crosswalk':
      console.log('Adding', browserToInstall, 'browser')
      self.installCrosswalk();
      break;
    case 'default':
      console.log('Adding', browserToInstall, 'browser')
      self.installDefaultBrowser();
      break;
    default:
      console.log('No accepted browser was specified.'.red.bold)
      break;
  }
}

IonicTask.prototype.removeBrowser = function() {
  var browser = 'crosswalk';

  if (argv._[2]) {
    browser = argv._[2];
    console.log('Removing', browser, 'browser')
  } else {
    console.log('You did not specify a browser to remove.'.red)
    return;
  }

  switch (browser) {
    case 'crosswalk':
      this.removeCrosswalk();
      break;
    case 'default':
      this.removeDefault();
      break;
  }

}

var printBrowsers = function(browsers) {
  for(var x = 0, y = browsers.length; x < y; x++) {
    var browser = browsers[x];
    var avail = browser.available ? 'Yes' : 'No';
    var installCommand = browser.command ? browser.command : '';

    if(browser.available) {
      console.log('Available'.green.bold, '-', browser.name.green, '-', installCommand)
    } else {
      console.log('Not Available Yet'.red.bold, '-', browser.name.green)
    }
  }
}

IonicTask.prototype.listBrowsers = function() {

  console.log('iOS - Browsers Listing:\n')

  printBrowsers(iosBrowsers);

  console.log('\n\nAndroid - Browsers Listing:\n')

  printBrowsers(androidBrowsers);
}

IonicTask.prototype.run = function(ionic) {
  var self = this;
  this.ionic = ionic;

  if(argv._.length < 2) {
    return this.ionic.fail('Invalid command usage', 'browser');
  }

  var cmdArg, x, y, hasValidCmd = false;

  cmdArg = argv._[1]

  var validCommands = 'add remove rm list ls revert'.split(' ');
  for(y=0; y<validCommands.length; y++) {
    if(cmdArg == validCommands[y]) {
      hasValidCmd = true;
      break;
    }
  }

  if(!hasValidCmd) {
    return this.ionic.fail('You did not supply a valid command', 'browser');
  }


  switch(cmdArg) {
    case 'add':
      this.addBrowser();
      break;
    case 'remove':
    case 'rm':
      this.removeBrowser();
      break;
    case 'revert':
      this.revertBrowser();
      break;
    case 'list':
    case 'ls':
      this.listBrowsers();
      break;
    case 'update':
    case 'up':
      this.addBrowser();
      break;
    case 'check':
      console.log('Checking for engine');
      break;
  }

  // IonicStats.t();

};

exports.IonicTask = IonicTask;
