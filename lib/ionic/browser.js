//Cross walk process

//See the cordova-engine-crosswalk plugin for how to install the browser as a plugin
//https://github.com/MobileChromeApps/cordova-crosswalk-engine

//Find CrossWalk webviews here:
//https://download.01.org/crosswalk/releases/crosswalk/android/stable/

//Clone the git repo for cordova-crosswalk-engine
//Clone the git repo for cordova-android 4.0.x
//Ensure Android API 19 is installed
//Run cordova platform rm android
//Run cordova platform add ./engine/cordova-android@4.0.x
//Run cordova plugin add ./engine/cordova-crosswalk-engine
//Run android update project on android file
//Run project - cordova run android BUILD_MULTIPLE_APKS=true

//Install the crosswalk latest files
// cordova platform remove android
// cordova platform add android@3.5

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



var XWALK_LIBRARY_PATH = path.join(process.cwd(), 'tmp', 'xwalk');
var ARM_DOWNLOAD_URL = "https://download.01.org/crosswalk/releases/crosswalk/android/canary/8.37.189.0/arm/crosswalk-webview-8.37.189.0-arm.zip";
var X86_DOWNLOAD_URL = "https://download.01.org/crosswalk/releases/crosswalk/android/canary/8.37.189.0/x86/crosswalk-webview-8.37.189.0-x86.zip";

function updateCrosswalkProject() {
	// prepare xwalk_core_library
	if(fs.existsSync(XWALK_LIBRARY_PATH)) {
	    exec('android update lib-project --path "' + XWALK_LIBRARY_PATH + '" --target "' + target_api + '"' )
	} else {
	    // TODO(wang16): download xwalk core library here
	    return Q.reject('No XWalk Library Project found. Please download it and extract it to $XWALK_LIBRARY_PATH')
	}
}

IonicTask.prototype.getCordovaCrosswalkEngine = function getCordovaCrosswalkEngine() {
  var q = Q.defer();

  if(!fs.existsSync(path.join(process.cwd(), 'engine'))) {
    shelljs.mkdir(path.join(process.cwd(), 'engine'));
  }

  if(fs.existsSync(path.join(process.cwd(), 'engine', 'cordova-crosswalk-engine'))) {
    q.resolve();
    return q.promise;
  }

  // shelljs.cd(path.join(process.cwd(), 'engine'));
  // var downloadResult = shelljs.exec('git clone --depth=1 git@github.com:MobileChromeApps/cordova-crosswalk-engine.git');
  var downloadUrl = 'https://github.com/driftyco/cordova-crosswalk-engine/archive/v0.8.zip';

  var tempZipFilePath = path.join(process.cwd(), 'engine', 'cordova-crosswalk-engine.zip');
  var zipOutPath = path.join(process.cwd(), 'engine');

  Ionic.fetchArchive(zipOutPath, downloadUrl)
  .then(function(data) {
    console.log('downloaded')
    q.resolve();
  }, function(error) {
    console.log('failed to download engine - ', error);
    q.reject();
  })

  return q.promise;
}

IonicTask.prototype.getAndroidRuntimes = function getAndroidRuntimes() {
  var command = 'echo "y" | android update sdk --no-ui --filter 19 --force';
  var result = shelljs.exec(command);

  if(result.code != 0) {
    console.log('error!');
  }
}

function downloadCrosswalkWebview(architecture, version) {
  // var command = 'curl -# https://download.01.org/crosswalk/releases/crosswalk/android/stable/' +
    // version + '/' + architecture + '/crosswalk-webview-' + version + '-' + architecture + '.zip -o library.zip';
  var q = Q.defer();

  var downloadUrl = 'https://download.01.org/crosswalk/releases/crosswalk/android/stable/' +
    version + '/' + architecture + '/crosswalk-webview-' + version + '-' + architecture + '.zip';

  var tempZipFilePath = path.join(process.cwd(), 'engine', 'xwalk-webviews', architecture);

  //Ensure xwalk-webviews folder exists
  if (!fs.existsSync(path.join(process.cwd(), 'engine', 'xwalk-webviews'))) {
    shelljs.mkdir(path.join(process.cwd(), 'engine', 'xwalk-webviews'));
  }

  Ionic.fetchArchive(tempZipFilePath, downloadUrl)
  .then(function(data) {
    console.log('xwalk download good - ', data);

    //Need to go copy to android directory.
    var fileName = fs.readdirSync(tempZipFilePath);
    console.log('fileName for dirs ', fileName)

    var copySource = path.join(tempZipFilePath, fileName[0], '*');
    console.log('copy source - ', copySource)

    var copyDestination = path.join(process.cwd(), 'engine', 'cordova-crosswalk-engine-0.8', 'libs', 'xwalk_core_library', '/')
    console.log('copyDestination - ', copyDestination);


    var cpXwalkLibsCmd = 'cp -r ' + copySource + ' ' + copyDestination;
    var cpResult = shelljs.exec(cpXwalkLibsCmd)

    console.log('Result from cp - ' , cpResult)
    // var archDirectory = fs.readdirSync(path.join(fileName[0]));
    // console.log('archDirectory - ', archDirectory);

    q.resolve(data);
  }, function(error) {
    console.log('xwalk download failed - ', error)
    q.reject(error);
  })

  // shelljs.cd(path.join(process.cwd(), 'engine', 'xwalk-webviews'));

  // console.log('Downloading the crosswalk webview for ' + architecture + ', version ' + version);
  // var resultCurl = shelljs.exec(command);

  // console.log('Unzipping webview binaries')
  // var unzipCommand = 'unzip -q library.zip -d unzipped';
  // var resultUnzip =  shelljs.exec(unzipCommand);
  // var fileName = fs.readdirSync('unzipped')[0];

  // console.log('file name: ', fileName);

  // shelljs.cd('../../'); //Back at process.cwd() in ionic project root

  // var copySource = path.join(process.cwd(), 'engine', 'xwalk-webviews', 'unzipped', fileName, '*');
  // console.log('copy source ', copySource)
  // var copyDestination = path.join(process.cwd(), 'engine', 'cordova-crosswalk-engine', 'libs', 'xwalk_core_library', '/');
  // var cpArmLibsCommand = 'cp -r ' + copySource + ' ' + copyDestination;
  // console.log('command: ', cpArmLibsCommand);
  // shelljs.exec(cpArmLibsCommand);

  // shelljs.rm('-rf', path.join(process.cwd(), 'engine', 'xwalk-webviews', 'unzipped'));
  return q.promise;
}

IonicTask.prototype.getCrosswalkWebviews = function getCrosswalkWebviews() {
  // var command = 'curl -# https://download.01.org/crosswalk/releases/crosswalk/android/stable/8.37.189.14/arm/crosswalk-webview-8.37.189.14-arm.zip -o arm.zip';
  var version = '8.37.189.14';

  var armPromise = downloadCrosswalkWebview('arm', version);
  var x86Promise = downloadCrosswalkWebview('x86', version);
  // downloadCrosswalkWebview('x86', version);

  return Q.all[armPromise, x86Promise];
}

IonicTask.prototype.getCordovaAndroid40x = function getCordovaAndroid40x() {
  var q = Q.defer();

  if (fs.existsSync(path.join(process.cwd(), 'engine', 'cordova-android'))) {
    q.resolve();
    return q.promise;
  }
  // var command = 'git clone --depth=1 -b 4.0.x git@github.com:apache/cordova-android.git';
  var downloadUrl = 'https://github.com/driftyco/cordova-android/archive/v4.0.x.zip';

  var tempZipFilePath = path.join(process.cwd(), 'engine');


  Ionic.fetchArchive(tempZipFilePath, downloadUrl)
  .then(function(data) {
    console.log('downloaded - ', data);
    q.resolve();
  }, function(error) {
    console.log('download fail - ', error);
    q.reject();
  })

  // shelljs.cd(path.join(process.cwd(), 'engine'));

  // var result = shelljs.exec(command);

  // shelljs.cd('..');

  return q.promise;
}

IonicTask.prototype.removeAndroidProject = function removeAndroidProject() {
  var command = 'cordova platform remove android';
  var result = shelljs.exec(command);
}

IonicTask.prototype.addCordova40xProject = function addCordova40xProject() {
  var command =  'cordova platform add ./engine/cordova-android-4.0.x/';
  var result = shelljs.exec(command);
}

IonicTask.prototype.addCrosswalkPlugin = function addCrosswalkPlugin() {
  var command = 'cordova plugin add ./engine/cordova-crosswalk-engine-0.8';
  var result = shelljs.exec(command);
}

IonicTask.prototype.updateAndroidProject = function updateAndroidProject() {
  var xwalkLibraryPath = path.join(process.cwd(), 'engine', 'cordova-crosswalk-engine-0.8', 'libs', 'xwalk_core_library');

  shelljs.cd(path.join(process.cwd(), 'platforms', 'android'));

  shelljs.exec('android update lib-project --path "' + xwalkLibraryPath + '" --target "4"');

  shelljs.cd('../../');
}

IonicTask.prototype.run = function(ionic) {
  var self = this;
  this.ionic = ionic;


  // this.getCordovaCrosswalkEngine()
  // .then(function(data) {
  //   console.log('we completed the download')
  //   return self.getCordovaAndroid40x();
  // }, function(error) {
  //   console.log('Error - ', error)
  // })
  // .then(function(data) {
  //   console.log('downloaded Android runtimes');

  //   self.getCrosswalkWebviews();

  // }, function(error) {
  //   console.log('failed to download android runtime');
  // })

  // this.getAndroidRuntimes();

  // this.getCordovaAndroid40x();

  this.removeAndroidProject();

  this.addCordova40xProject();

  this.addCrosswalkPlugin();

  this.updateAndroidProject();

  // IonicStats.t();

};

exports.IonicTask = IonicTask;
