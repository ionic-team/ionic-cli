//Cross walk process
//the bin/create method fires off the android update project

// A few notes
// Stuck currently to cordova android 3.5 - that means restricting cordova plugins to whatever was working with 3.5



//Install the crosswalk latest files
// cordova platform remove android
// cordova platform add android@3.5
var path = require('path');

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
