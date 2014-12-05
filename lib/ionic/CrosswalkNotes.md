Crosswalk Notes

Cloned down Cordova android 4.0.x
Ran download shell
Copied files into plugin libs
Plugin add that downloaded plugin


When running `cordova run android` -
-----------------------
* Where:
Script '/Users/JoshBavari/Development/testing/crosswalk-engine/platforms/android/cordova.gradle' line: 59

* What went wrong:
A problem occurred evaluating script.
> No installed build tools found. Please install the Android build tools version 19.1.0 or higher.

Had to bump the minversionnumber in platform/android/AndroidManifest.xml to 14 from 10.
