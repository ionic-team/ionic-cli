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




## Roadmap for Crosswalk integration

Cordova release in Jan 2015 is pushing for pluggable web views

In the meantime, do we go ahead and release now as a beta?

When they do release, how do we integrate with those changes?



`ionic browser add crosswalk` will add that engine file.
It will also add a platform for android
How do we handle the case of when they want to re-add stuffs?
Removing Android - browser remove feature

