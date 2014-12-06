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

  if(fs.existsSync(path.join(process.cwd(), 'engine', 'cordova-crosswalk-engine'))) {
    return; //It exists, nothing to do here.
  }

  shelljs.cd(path.join(process.cwd(), 'engine'));
  var downloadResult = shelljs.exec('git clone --depth=1 git@github.com:MobileChromeApps/cordova-crosswalk-engine.git');
  shelljs.cd('..')

  if(downloadResult.code == 1) {
    //LOG ERROR
  }
}

IonicTask.prototype.getAndroidRuntimes = function getAndroidRuntimes() {
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

function downloadCrosswalkEngine(architecture, version) {
  var command = 'curl -# https://download.01.org/crosswalk/releases/crosswalk/android/stable/' +
    version + '/' + architecture + '/crosswalk-webview-' + version + '-' + architecture + '.zip -o library.zip';

  //Ensure xwalk-webviews folder exists
  if (!fs.existsSync(path.join(process.cwd(), 'engine', 'xwalk-webviews'))) {
    shelljs.mkdir(path.join(process.cwd(), 'engine', 'xwalk-webviews'));
  }

  shelljs.cd(path.join(process.cwd(), 'engine', 'xwalk-webviews'));

  console.log('Downloading the crosswalk webview for ' + architecture + ', version ' + version);
  var resultCurl = shelljs.exec(command);

  //TODO: Check for resultCurl

  console.log('Unzipping webview binaries')
  var unzipCommand = 'unzip -q library.zip -d unzipped';
  var resultUnzip =  shelljs.exec(unzipCommand);
  var fileName = fs.readdirSync('unzipped')[0];

  console.log('file name: ', fileName);

  shelljs.cd('../../'); //Back at process.cwd() in ionic project root

  var copySource = path.join(process.cwd(), 'engine', 'xwalk-webviews', 'unzipped', fileName, '*');
  console.log('copy source ', copySource)
  var copyDestination = path.join(process.cwd(), 'engine', 'cordova-crosswalk-engine', 'libs', 'xwalk_core_library', '/');
  var cpArmLibsCommand = 'cp -r ' + copySource + ' ' + copyDestination;
  console.log('command: ', cpArmLibsCommand);
  shelljs.exec(cpArmLibsCommand);

  shelljs.rm('-rf', path.join(process.cwd(), 'engine', 'xwalk-webviews', 'unzipped'));

}

IonicTask.prototype.getCrosswalkWebviews = function getCrosswalkWebviews() {
  // var command = 'curl -# https://download.01.org/crosswalk/releases/crosswalk/android/stable/8.37.189.14/arm/crosswalk-webview-8.37.189.14-arm.zip -o arm.zip';
  var version = '8.37.189.14';

  downloadCrosswalkEngine('arm', version);
  downloadCrosswalkEngine('x86', version);
}

IonicTask.prototype.getCordovaAndroid40x = function getCordovaAndroid40x() {
  if (fs.existsSync(path.join(process.cwd(), 'engine', 'cordova-android'))) {
    return;
  }
  var command = 'git clone --depth=1 -b 4.0.x git@github.com:apache/cordova-android.git';

  shelljs.cd(path.join(process.cwd(), 'engine'));

  var result = shelljs.exec(command);

  shelljs.cd('..');
}

IonicTask.prototype.removeAndroidProject = function removeAndroidProject() {
  var command = 'cordova platform remove android';
  var result = shelljs.exec(command);
}

IonicTask.prototype.addCordova40xProject = function addCordova40xProject() {
  var command =  'cordova platform add ./engine/cordova-android/';
  var result = shelljs.exec(command);
}

IonicTask.prototype.addCrosswalkPlugin = function addCrosswalkPlugin() {
  var command = 'cordova plugin add ./engine/cordova-crosswalk-engine';
  var result = shelljs.exec(command);
}

IonicTask.prototype.updateAndroidProject = function updateAndroidProject() {
  var xwalkLibraryPath = path.join(process.cwd(), 'engine', 'cordova-crosswalk-engine', 'libs', 'xwalk_core_library');

  shelljs.cd(path.join(process.cwd(), 'platforms', 'android'));

  shelljs.exec('android update lib-project --path "' + xwalkLibraryPath + '" --target "4"');

  shelljs.cd('../../');
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

  this.addCrosswalkPlugin();

  this.updateAndroidProject();

  // IonicStats.t();

};

exports.IonicTask = IonicTask;
