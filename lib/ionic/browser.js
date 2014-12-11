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
  var command = 'echo "y" | android update sdk --no-ui --filter 19 --force';
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

    console.log('Copy result: ', cpResult);

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
    console.log('Finished downloading cordova-android v4.0.x');
    //Need to make certain files executable
    var cordovaAndroid4Path = path.join(tempZipFilePath, 'cordova-android-crosswalk', 'bin');
    var android4BinPath = path.join(cordovaAndroid4Path, 'templates', 'cordova');
    shelljs.chmod('+x', path.join(cordovaAndroid4Path, '*'));
    shelljs.chmod('+x', path.join(android4BinPath, '*'))
    console.log('Changed permissions')
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
}

IonicTask.prototype.addCordova40xProject = function addCordova40xProject() {
  var command =  'cordova platform add ./engine/cordova-android-crosswalk/';
  var result = shelljs.exec(command);
}

IonicTask.prototype.addCrosswalkPlugin = function addCrosswalkPlugin() {
  var command = 'cordova plugin add ./engine/cordova-crosswalk-engine-0.8';
  var result = shelljs.exec(command);
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
    console.log('Downloaded cordova-crosswalk-engine');
    return self.downloadCordova40x();
  })
  .then(function(data) {
    console.log('Downloaded Cordova Android for Crosswalk');
    return self.getCrosswalkWebviews();
  })
  .then(function(data) {
    console.log('Downloaded Crosswalk webviews');
    return self.getAndroidRuntimes();
  })
  .then(function(data) {
    console.log('Downloaded Android runtime (API 19)');
    q.resolve();
  }, function(error) {
    q.reject();
  })
  .catch(function(error){
    q.reject(error);
  })

  return q.promise;
}

IonicTask.prototype.run = function(ionic) {
  var self = this;
  this.ionic = ionic;

  this.downloadFiles()
  .then(function(data) {
    self.removeAndroidProject();

    self.addCordova40xProject();

    self.addCrosswalkPlugin();

    self.updateAndroidProject();
  })

  // IonicStats.t();

};

exports.IonicTask = IonicTask;
