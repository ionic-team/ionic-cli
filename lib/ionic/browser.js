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
    IonicStats = require('./stats').IonicStats,
    _ = require('underscore'),
    IonicProject = require('./project'),
    IonicInfo = require('./info').IonicTask;

shelljs.config.silent = true;

var crosswalkEngineVersion = 'c0.6.2',
    cordovaAndroidVersion = 'c0.5.6',
    platforms = ['android', 'ios'];

var crosswalkVersions = [
  {
    version: '8.37.189.14',
    publish_date: '2014-10-10 03:26'
  },
  {
    version: '9.38.208.10',
    publish_date: '2014-11-25 11:45'
  },
  {
    version: '10.39.235.15',
    publish_date: '2014-12-31 13:16'
  },
  {
    version: '11.40.277.1',
    publish_date: '2015-01-05 02:52',
    beta: true
  },
  {
    version: '11.40.277.0',
    publish_date: '2015-01-01 08:27',
    canary: true
  },
  {
    version: '12.40.283.0',
    publish_date: '2015-01-12 08:27',
    canary: true
  }
];

var defaultCrosswalkVersion = crosswalkVersions[3].version;

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
      command: 'ionic browser add crosswalk',
      versions: crosswalkVersions
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

  var cordovaCrosswalkFolderName = ['cordova-crosswalk-engine-', crosswalkEngineVersion].join('');

  if(fs.existsSync(path.join(process.cwd(), 'engine', cordovaCrosswalkFolderName))) {
    q.resolve();
    return q.promise;
  }

  var downloadUrl = ['https://github.com/driftyco/cordova-crosswalk-engine/archive/', crosswalkEngineVersion, '.zip'].join('');

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

// IonicTask.prototype.getAndroidRuntimes = function getAndroidRuntimes() {
//   var command = 'echo "y" | android update sdk --no-ui --all --filter 10';
//   console.log('\nFetching Android SDK API 19.1.0')
//   // var result = shelljs.exec(command, { silent: true } );

//   // if(result.code != 0) {
//   //   var errorMessage = 'Had an error fetching the Android SDK required for Crosswalk.';
//   //   this.ionic.fail(errorMessage);
//   //   throw new Error(errorMessage);
//   // }
// }

IonicTask.prototype.copyInCrosswalkLibrariesToCrosswalkEngine = function copyInCrosswalkLibrariesToCrosswalkEngine(architecture, version) {
  var copyMessage = ['\nCopying over Crosswalk Webview (', architecture, ') to the Crosswalk Engine\n'].join('');
  console.log(copyMessage)
  var xwalkFilePath = path.join(process.cwd(), 'engine', 'xwalk-webviews', architecture);
  var fileName = fs.readdirSync(xwalkFilePath);
  var cordovaCrosswalkFolder = ['cordova-crosswalk-engine-', crosswalkEngineVersion].join('');
  var copySource = path.join(xwalkFilePath, fileName[0], '*');

  var copyDestination = path.join(process.cwd(), 'engine', cordovaCrosswalkFolder, 'libs', 'xwalk_core_library', '/');

  // console.log('copying - ', copySource, copyDestination)

  shelljs.cp('-R', copySource, copyDestination);
  var copyCompleteMessage = ['Finished copying Crosswalk Webview (', architecture, ') to the Crosswalk Engine'].join('');
  console.log(copyCompleteMessage)

}

IonicTask.prototype.downloadCrosswalkWebview = function downloadCrosswalkWebview(architecture, version, releaseStatus) {
  var q = Q.defer();
  var self = this;

  var downloadUrl = 'https://download.01.org/crosswalk/releases/crosswalk/android/' + releaseStatus + '/' +
    version + '/' + architecture + '/crosswalk-webview-' + version + '-' + architecture + '.zip';

  var tempZipFilePath = path.join(process.cwd(), 'engine', 'xwalk-webviews', architecture);

  if (!fs.existsSync(path.join(process.cwd(), 'engine', 'xwalk-webviews'))) {
    shelljs.mkdir(path.join(process.cwd(), 'engine', 'xwalk-webviews'));
  }

  var xwalkPath = ['crosswalk-webview-', version, '-', architecture].join('');
  var xwalkArchPath = path.join(tempZipFilePath, xwalkPath)

  if(fs.existsSync(xwalkArchPath)) {
    //We've already downloaded it. Copy it over!
    self.copyInCrosswalkLibrariesToCrosswalkEngine(architecture, version)
    q.resolve()
    return;
  }

  Ionic.fetchArchive(tempZipFilePath, downloadUrl)
  .then(function(data) {
    self.copyInCrosswalkLibrariesToCrosswalkEngine(architecture, version)
    q.resolve(data);
  }, function(error) {
    console.log('Crosswalk webviews failed to download - ')
    q.reject(error);
  })

  return q.promise;
}

IonicTask.prototype.getCrosswalkWebviews = function getCrosswalkWebviews(version) {
  // var version = version ? version : '8.37.189.14';

  var xwalkVersion = _.findWhere(crosswalkVersions, { version: version });

  // console.log('xwalk', xwalkVersion)

  if(!xwalkVersion) {
    console.log('\nYou must specify a valid version from crosswalk. Run `ionic browser list` to see versions')
    // q.reject('You must specify a valid version from crosswalk. Run `ionic browser list` to see versions')
    throw new Error('Invalid version of Crosswalk specified');
  }

  var releaseStatus = 'stable';

  if(xwalkVersion.beta) {
    releaseStatus = 'beta';
  } else if(xwalkVersion.canary) {
    releaseStatus = 'canary';
  }

  var armPromise = this.downloadCrosswalkWebview('arm', version, releaseStatus);
  var x86Promise = this.downloadCrosswalkWebview('x86', version, releaseStatus);

  return Q.all([armPromise, x86Promise]);
}

IonicTask.prototype.downloadCordova40x = function downloadCordova40x() {
  var q = Q.defer();
  var self = this;

  var crosswalkEngineUnzipName = ['cordova-android-', cordovaAndroidVersion].join('');
  var downloadUrl = ['https://github.com/driftyco/cordova-android/archive/', cordovaAndroidVersion, '.zip'].join('');

  var tempZipFilePath = path.join(process.cwd(), 'engine');
  var cordovaAndroid4Path = path.join(tempZipFilePath, crosswalkEngineUnzipName, 'bin');
  var android4BinPath = path.join(cordovaAndroid4Path, 'templates', 'cordova');

  if(fs.existsSync(path.join(tempZipFilePath, crosswalkEngineUnzipName))) {

    self.setPermissionsForFolder(cordovaAndroid4Path);
    self.setPermissionsForFolder(android4BinPath);

    q.resolve();
    return;
  }

  Ionic.fetchArchive(tempZipFilePath, downloadUrl)
  .then(function(data) {
    console.log('\nFinished downloading cordova-android v4.0.x');
    //Need to make certain files executable
    self.setPermissionsForFolder(cordovaAndroid4Path)
    self.setPermissionsForFolder(android4BinPath)
    console.log('\nAltered permissions for Android Paths')
    q.resolve();
  }, function(error) {
    console.log('Failed to download cordova-android v4.0.x ', error);
    q.reject();
  })

  return q.promise;
}

IonicTask.prototype.setPermissionsForFolder = function setPermissionsForFolder(folderName) {
  var self = this;

  fs.readdir(folderName, function(err, files){
    if(err) return;
    for(var x=0; x<files.length; x++) {
      var file = path.join(folderName, files[x]);
      try {
        fs.chmodSync(file, '755');
      }catch (ex) {
        self.ionic.fail(['Error setting file permissions for file', file, ex].join(' '))
      }
    }
  });
}

IonicTask.prototype.removeAndroidProject = function removeAndroidProject() {
  var command = 'cordova platform remove android';
  var result = shelljs.exec(command);
  console.log('\nRemoved old Cordova Android platform')
}

IonicTask.prototype.addCordova40xProject = function addCordova40xProject() {
  var command =  ['ionic platform add ./engine/cordova-android-', cordovaAndroidVersion, '/'].join('');
  var result = shelljs.exec(command);

  if(result.code != 0) {
    var errorMessage = ['There was an error adding the Cordova Android library', result.output].join('\n');
    this.ionic.fail(errorMessage);
    throw new Error(errorMessage);
  } else {
    console.log('\nAdded Cordova Android 4.0')
  }

}

IonicTask.prototype.addCrosswalkPlugin = function addCrosswalkPlugin() {
  var command = ['cordova plugin add ./engine/cordova-crosswalk-engine-', crosswalkEngineVersion].join('');
  var result = shelljs.exec(command);
  console.log('\nAdded Crosswalk Webview Engine')
}

IonicTask.prototype.removeCrosswalkEngines = function removeCrosswalkEngines() {
  shelljs.exec('cordova plugin rm org.apache.cordova.engine.crosswalk');
  shelljs.exec('cordova plugin rm org.crosswalk.engine');
}

IonicTask.prototype.updateAndroidProject = function updateAndroidProject() {
  var crosswalkEnginePath = ['cordova-crosswalk-engine-', crosswalkEngineVersion].join('');
  var xwalkLibraryPath = path.join(process.cwd(), 'engine', crosswalkEnginePath, 'libs', 'xwalk_core_library');
  var updateCommand = ['android update lib-project --path "', xwalkLibraryPath, '" --target "4"'].join('');

  shelljs.cd(path.join(process.cwd(), 'platforms', 'android'));

  shelljs.exec(updateCommand, {silent: true});

  shelljs.cd('../../');
}

IonicTask.prototype.downloadFiles = function downloadFiles(version) {
  var q = Q.defer();

  var self = this;
  this.getCordovaCrosswalkEngine()
  .then(function(data) {
    console.log('\nDownloaded cordova-crosswalk-engine');
    return self.downloadCordova40x();
  })
  .then(function(data) {
    console.log('\nDownloaded Cordova Android for Crosswalk');
    return self.getCrosswalkWebviews(version);
  })
  // .then(function(data) {
  //   console.log('\nDownloaded Crosswalk webviews');
  //   return self.getAndroidRuntimes();
  // })
  .then(function(data) {
    console.log('\nDownloaded Crosswalk webviews');
    q.resolve();
  }, function(error) {
    q.reject();
  })
  .catch(function(error){
    console.log('There was an error finishing the browser command - ', error);
    q.reject(error);
  })

  return q.promise;
}

IonicTask.prototype.removeCrosswalk = function removeCrosswalk() {
  shelljs.exec('cordova plugin rm org.apache.cordova.engine.crosswalk')
  shelljs.exec('cordova plugin rm org.crosswalk.engine')
  shelljs.exec('cordova platform rm android')
  shelljs.exec('cordova platform add android')
}

IonicTask.prototype.installCrosswalk = function installCrosswalk(version) {
  var self = this;

  self.downloadFiles(version)
  .then(function(data) {
    self.removeAndroidProject();
    self.removeCrosswalkEngines();
    self.addCordova40xProject();
    self.addCrosswalkPlugin();
    self.updateAndroidProject();

    console.log('\nIonic Browser Add completed for Crosswalk');
  })
  .catch(function(error){
    console.log('\nAn error with adding Crosswalk browser occured')
    self.ionic.fail(error)
    // console.log(error)
  })
}

IonicTask.prototype.clean = function clean() {
  console.log('Cleaning up Ionic browser artifacts'.green)
  shelljs.rm('-rf', './engine');
  console.log('Cleaned'.yellow)
}

IonicTask.prototype.upgradeCrosswalk = function upgradeCrosswalk() {
  console.log('Updating your Ionic project with the latest build of Crosswalk'.green)
  this.clean();
  this.installCrosswalk(defaultCrosswalkVersion);
  
}

IonicTask.prototype.revertBrowser = function revertBrowser() {
  var self = this;

  var platform = argv._[2];

  if (!platform) {
    console.log('You did not specify a platform to revert the browser');
    return
  }

  if(platforms.indexOf(platform) == -1) {
    console.log('You did not specify a valid platform.');
    return
  }

  console.log('Reverting', platform, 'browser');

  var rmCommand = ['cordova platform rm', platform].join(' ');
  var addCommand = ['cordova platform add', platform].join(' ');

  shelljs.exec(rmCommand)

  if(platform == 'android') {
    self.removeCrosswalk();
  }

  shelljs.exec(addCommand)

  console.log('Reverted', platform, 'browser');
}

IonicTask.prototype.saveBrowserInstallation = function saveBrowserInstallation(platform, browser, version) {
  var project = IonicProject.load();
  var browsers = project.get('browsers') || [];
  var platformExists = false, platformIndex = 0;
  var browserEntry = { platform: platform, browser: browser, version: version };

  for( ; platformIndex < browsers.length; platformIndex++) {
    var platformBrowser = browsers[platformIndex];
    if(platformBrowser.platform == platform) {
      platformExists = true;
      break;
    }
  }

  if(platformExists) {
    browsers[platformIndex] = browserEntry;
  } else {
    browsers.push(browserEntry)
  }

  project.set('browsers', browsers);
  project.save();
}

IonicTask.prototype.addBrowser = function addBrowser() {
  var self = this;

  //Check which browser they wish to install
  var browserToInstall = 'crosswalk',
      platform = 'android',
      browserVersion = null
      validBrowserSpecified = false;
  if (argv._[2]) {
    browserToInstall = argv._[2];
  } else {
    console.log('No browser specified. Nothing to do here.'.red.bold)
    return;
  }

  if(browserToInstall.indexOf('@') !== -1) {
    //Browser version specified. Find version number.
    var browserVersionAttempt = argv._[2].split('@');
    browserToInstall = browserVersionAttempt[0];
    browserVersion = browserVersionAttempt[1];
  } else {
    browserVersion = defaultCrosswalkVersion;
  }

  switch(browserToInstall) {
    case 'crosswalk':
      console.log('Adding', browserToInstall, 'browser')
      self.installCrosswalk(browserVersion);
      validBrowserSpecified = true;
      break;
    case 'default':
      console.log('Adding', browserToInstall, 'browser')
      self.installDefaultBrowser();
      validBrowserSpecified = true;
      break;
    default:
      console.log('No accepted browser was specified.'.red.bold)
      validBrowserSpecified = false;
      break;
  }

  if(validBrowserSpecified) {
    self.saveBrowserInstallation(platform, browserToInstall, browserVersion);
  }
}

IonicTask.prototype.removeBrowser = function removeBrowser() {
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

var printBrowsers = function printBrowsers(browsers) {
  for(var x = 0, y = browsers.length; x < y; x++) {
    var browser = browsers[x];
    var avail = browser.available ? 'Yes' : 'No';
    var installCommand = browser.command ? browser.command : '';

    if(browser.available) {
      console.log('\nAvailable'.green.bold, '-', browser.name.green, '-', installCommand)
      if(browser.versions) {
        for(version in browser.versions) {
          var ver = browser.versions[version];

          var betaCanaryMessage = null;

          if(ver.beta) {
            betaCanaryMessage = '(beta)\t'
          } else if (ver.canary) {
            betaCanaryMessage = '(canary)'
          } else {
            betaCanaryMessage = '\t';
          }

          // console.log('betacanary', betaCanaryMessage)
          // console.log('beta canary msg', betaCanaryMessage)
          console.log(betaCanaryMessage, 'Version'.blue, ver.version.yellow, 'Published'.cyan, new Date(ver.publish_date))
        }
      }
    } else {
      console.log('Not Available Yet'.red.bold, '-', browser.name.green)
    }
  }
}

IonicTask.prototype.listBrowsers = function listBrowsers() {
  console.log('iOS - Browsers Listing:\n')

  printBrowsers(iosBrowsers);

  console.log('\n\nAndroid - Browsers Listing:\n')

  printBrowsers(androidBrowsers);
}

IonicTask.prototype.listInstalledBrowsers = function listInstalledBrowsers() {
  var project = IonicProject.load();

  var browsers = project.get('browsers');

  console.log('\nInstalled browsers:\n'.green)

  for(browserIndex in browsers) {
    var browser = browsers[browserIndex]
    console.log('For', browser.platform, '-', browser.browser, browser.version)
  }

  console.log('\n')
}

IonicTask.prototype.run = function run(ionic) {
  var self = this;
  this.ionic = ionic;

  var infoChecker = new IonicInfo();
  if(!infoChecker.checkRuntime()) {
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


  switch(cmdArg) {
    case 'add':
      this.addBrowser();
      break;
    case 'clean':
      this.clean();
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
    case 'upgrade':
      this.upgradeCrosswalk();
      break;
    case 'update':
    case 'up':
      this.addBrowser();
      break;
    case 'check':
      console.log('Checking for engine');
      break;
    case 'versions':
      this.listInstalledBrowsers();
  }

  IonicStats.t();

};

exports.IonicTask = IonicTask;
