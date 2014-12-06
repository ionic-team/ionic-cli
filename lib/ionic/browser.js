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
//Run project

//Install the crosswalk latest files
// cordova platform remove android
// cordova platform add android@3.5
var path = require('path'),
    shelljs = require('shelljs');

var XWALK_LIBRARY_PATH = path.join(process.cwd(), 'tmp', 'xwalk');
var ARM_DOWNLOAD_URL = "https://download.01.org/crosswalk/releases/crosswalk/android/canary/8.37.189.0/arm/crosswalk-webview-8.37.189.0-arm.zip";
var X86_DOWNLOAD_URL = "https://download.01.org/crosswalk/releases/crosswalk/android/canary/8.37.189.0/x86/crosswalk-webview-8.37.189.0-x86.zip";

function downloadFiles() {
	var tempDir = '../../tmp/crosswalk-engine';
	//Download ARM
	//unzip ARM
	//rm zip
	var libCrossWalk = path.join(process.cwd(), 'libs', 'xwalk_core_library');

}

function updateCrosswalkProject() {
	// prepare xwalk_core_library
	if(fs.existsSync(XWALK_LIBRARY_PATH)) {
	    exec('android update lib-project --path "' + XWALK_LIBRARY_PATH + '" --target "' + target_api + '"' )
	} else {
	    // TODO(wang16): download xwalk core library here
	    return Q.reject('No XWalk Library Project found. Please download it and extract it to $XWALK_LIBRARY_PATH')
	}
}

function ensureAndroidLibs() {
  var command = 'echo "y" | android update sdk --no-ui --filter 19 --force';
  var result = shelljs.exec(command);

  if(result.code != 0) {
    console.log('error!');
  }

}
// download() {
//     TMPDIR=cordova-crosswalk-engine-$$
//     pushd $TMPDIR > /dev/null
//     echo "Fetching $1..."
//     curl -# $1 -o library.zip
//     unzip -q library.zip
//     rm library.zip
//     PACKAGENAME=$(ls|head -n 1)
//     echo "Installing $PACKAGENAME into xwalk_core_library..."
//     cp -a $PACKAGENAME/* ../libs/xwalk_core_library
//     popd > /dev/null
//     rm -r $TMPDIR
// }

// download $ARM_DOWNLOAD
// download $X86_DOWNLOAD



var fs = require('fs'),
    path = require('path'),
    argv = require('optimist').argv,
    shelljs = require('shelljs'),
    Task = require('./task').Task,
    proxyMiddleware = require('proxy-middleware'),
    IonicStats = require('./stats').IonicStats;

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.getCrosswalkEngine = function getCrosswalkEngine() {
  if(!fs.existsSync(path.join(process.cwd(), 'engine'))) {
    shelljs.mkdir(path.join(process.cwd(), 'engine'));
  }

  var downloadResult = shelljs.exec('git clone git@github.com:MobileChromeApps/cordova-crosswalk-engine.git');

  if(downloadResult.code == 1) {
    //LOG ERROR
  }
}

IonicTask.prototype.run = function(ionic) {
  var self = this;
  this.ionic = ionic;


  this.getCrosswalkEngine();

  this.getAndroidRuntimes();

  this.getCrosswalkWebviews();

  this.getCordovaAndroid40x();

  this.removeAndroidProject();

  this.addCordova40xProject();

  this.updateAndroidProject();
  // this.port = argv._[1];
  // this.liveReloadPort = argv._[2];

  IonicStats.t();

};



exports.IonicTask = IonicTask;
