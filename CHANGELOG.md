### Next-release

* Updating task order in the CLI output for help - putting more important tasks at the top, and lesser used ones at the bottom
* Updated README to have basic info at top, more advanced information at bottom
* Bumping cordova-android to our fork version of c0.5.6 to have latest commits from the Cordova-android team.
* Bumping cordova-crosswalk-engine to our fork version of c0.6.2 for latest changes by the Mobile chrome team.

### 1.3.10

* Updating after_platform_add hook 010_install_plugins.js to check to see if the directory running the commands is in fact a valid Ionic project directory.
* ionic start now checks that you pass a valid directory name, no longer accepting '.'
* Fix for install_plugins to check that is in a valid ionic project
* Checks for invalid contents of your config.xml file and reports those to help you fix the errors
* Fix for `ionic info` - now properly displays OSX Mavericks as operating system if it is indeed Mavericks

### 1.3.9

* Fixed an error where running `ionic serve` and then pressing `q` in the console would have an error trying to close a non-existent process
* Fixing an error where it tries to read a promise from a null/undefined object.
* Updating the error message for if/when `ionic templates` fails to download latest templates
* Added semver to the required node modules for version checking
* Added a version checking utility for cordova cli and node - `ionic info` tells you what you need to run correctly
* Added a version check in the browser command - that way you can stay up to date where it matters
* Modified browser process addition process to use `ionic platform add` to ensure hooks are set up properly
* Modified browser process to change permissions on files using `fs` instead of `shelljs`
* Now upon receiving an error, the CLI will dump system environment information to help the user copy/paste to issues

### 1.3.8

* Added a check in reading to read the ionic.project file in and catches and reports any exception that may from loading invalid characters in JSON.
* Added in an additional browser command `ionic browser clean` that will clean out all the artifacts from the browser additions
* Modified the browser addition process by copying crosswalk libraries over as its own method, and calling this even if the xwalk libraries are downloaded.

### 1.3.7

* Fixed some capitalization errors on the Ionic download url

### 1.3.6

* Fixed some bad lowercasing in the sign up prompt with IONIC_DASH

### 1.3.5

* Added a sign up prompt after starting a new ionic app to create an ionic.io account to take advantage of all the extra features Ionic has to provide.

### 1.3.4

* Added the ionic news updates for when `ionic start` finishes - alerts the users of the latest changes for ionic
* Updated cordova android and the cordova crosswalk engine to be versioned. Now they pull the latest dev commits.
* Due to the cordova crosswalk engine changing its plugin ID, the browser command now removes the older plugin name (org.apache.cordova.crosswalk.engine to org.crosswalk.engine)
* Updated cordova android to have a gradle.properties file to give the user options to build multiple architectures by default

### 1.3.3

* Added the ability to specify an address when using `ionic serve` by specifying the address as an argument: `ionic serve --address 192.168.1.100`
* Added the ability to download and target select versions of beta / canary versions of Crosswalk - see `ionic browser list` to see versions available.
* Fixed the issue with `ionic serve` - when typing 'q' or 'quit' in the prompt, it will properly kill the gulp spawned process. Previously, it was left behind.
* When adding a browser for a platform, the version of that browser and name shall be saved.
* Now when you type `ionic browser versions` - it will list all installed browsers and versions for the platform its installed for.
* Bumped connect-livereload up to 0.5.2 to resolve [an issue](https://github.com/intesso/connect-livereload/issues/41) from its repository regarding cookies.
* Fixes for uploading - now provides more meaningful errors.
* Added the ability to list all Ionic starter templates available for Ionic. Use `ionic start --list` or `ionic templates` to see available starter templates.
* Updating ionic help information to give better understanding to ions and bower components `ionic help add`, `ionic help remove` and `ionic help list`
* Updating ionic help information about the `ionic serve --lab` feature to let users know how to use it.
* Fixed a small bug when using `ionic start --sass dir template` - before the boolean command line arguments were eating the following argument. This has been fixed by adding boolean properties to optimist.
* Added the stdio inheritance to have your gulp watch task inherit coloring.
* Added the ability for you to specify an alternate document root  to use with `ionic serve` other than the default `www`. This is specified in your `ionic.project` file as a `documentRoot` property.
* Adding a cordova hook to remove Ionic SASS files from platforms folders. This should save you about 340K of space on your device builds.
* Adding a cordova hook to ensure platforms and plugins folder exist before adding a platform.
* Adding a cordova hook to store plugins in package.json file as `cordovaPlugins` when a plugin is added or removed.
* Adding a cordova hook to install plugins listed in package.json file as `cordovaPlugins` after a platform is added to the project.


### 1.3.2

* Added another fix for the way the cookies were handled for `ionic upload` - changing from `cookie.name` to `cookie.key`

### 1.3.1

* [Adding the Crosswalk browser for Ionic](http://ionicframework.com/blog/crosswalk-comes-to-ionic/)
* See all the browsers available to install - `ionic browser list`. *NOTE: Only stable releases are allowed for now.*
* You can now specify [which version of the Crosswalk run time](https://download.01.org/crosswalk/releases/crosswalk/android/stable/) you want to use - `ionic browser add crosswalk@8.37.189.14`.
* Caching the Crosswalk downloads - once you’ve installed a version in a project, running `ionic browser add crosswalk` will not re-download the webviews if they have previously been downloaded.
* Fixed an issue with `ionic upload` - now you should be able to log in and re-use your login cookies without errors.

### 1.3.0

* You can now use [Crosswalk in your Android projects](http://forum.ionicframework.com/t/crosswalk-integration-beta-in-ionic-cli/15190). Crosswalk is a way to package your Chrome Webview and use it with Cordova. Use the `ionic help browser` command to get more information about it.
* Automatically add the `SplashScreen` and `SplashScreenDelay` preference configs for Android splash screens
* When an orientation is locked using the [preference config](http://cordova.apache.org/docs/en/edge/config_ref_index.md.html#The%20config.xml%20File_global_preferences), only build the necessary splash screen images


### 1.2.14

* [Automating Icons and Splash Screens](http://ionicframework.com/blog/automating-icons-and-splash-screens/)
* Automatically create icon resources from source file: `ionic resources --icon`
* Automatically create splash screen resources from source file: `ionic resources --splash`
* Update config.xml resource platform nodes


### 1.2.13

* Locking Gulp at 3.8.8 to avoid adding the v8flags module dependency


### 1.2.12

* Updating the npm-shrinkwrap


### 1.2.11

* Updating the Labs styles


### 1.2.10

* Updated the serve command for the `serve --labs` to use `IONIC_LAB_URL`


### 1.2.9

* [Introduced Ionic Labs](http://ionicframework.com/blog/ionic-lab/) - a way to see preview iOS and Android side by side in the browser
* Added proxy-middleware to provide proxying to APIs from the `serve` command
* Updated README doc about how to use the proxy
* Injects platform specific class to HTML to view it as an iOS or Android device in browser
* Bumped `serve-static` to 1.7.1 to avoid some errors with the `serve` for users of Node 0.12
* Added the `add` command to use ionic to manage bower components
* Ionic now reads the Node environment variable `http_proxy` along with the passed `PROXY` variable to get around a local proxy


### 1.2.8

* CSRF cookie fixes


### 1.2.7

* npm-shrinkwrap
* Update ionic.io API URL


### 1.2.6

* Fix `fs.chmodSync: Error: ENOENT` for existing projects
* Fix lib update
* Add ionic app task
* Starter projects can provide `app.json` to specify plugins and sass setup


### 1.2.5

* Do not watch `www/lib/` files by default
* Set watchPatterns within ionic.project config file
* Friendly EMFILE error when too many files are watched
* Ensure config.xml content[src] gets reset after run/emulate
* Improve fetchArchive error handling
* Fix SSL Cert errors
* Do not prompt for address selection when there's only one


### 1.2.4

* Use `cross-spawn` module to fix errors with using spawn on Windows
* Start ionic project from any Github repo
* Start ionic projects using a local directory
* Use specific npm versions in package.json to avoid any future errors from breaking changes
* Fix write errors after downloading github archive files
* Refactor sass setup to use gulpStartupTasks ionic.project property instead


### 1.2.3

* From the server, use `restart` or `r` to restart the client app from the root
* From the server, use `goto` or `g` a url to have the client app navigate to the given url
* From the server, use `consolelogs` or `c` enable/disable console log output
* From the server, use `serverlogs` or `s` to enable/disable server log output
* From the server, use `quit` or `q` to shutdown the server and exit
* Print out Ionic server command tips
* LiveReload server logs specify which device made the request (iOS, Android, etc.)
* Remember address selection [#91](https://github.com/driftyco/ionic-cli/issues/91)
* Reset address selection with `ionic address`
* Add localhost as an option of possible addresses to use [#88](https://github.com/driftyco/ionic-cli/issues/88)
* Inject scripts after charset [#87](https://github.com/driftyco/ionic-cli/issues/87)
* Improved error message when unable to find an IP address [#85](https://github.com/driftyco/ionic-cli/issues/85)
* Fix config.xml errors when in the wrong working directory [#84](https://github.com/driftyco/ionic-cli/issues/84)


### 1.2.2

* ReferenceError hot fix


### 1.2.1

* Clean up any cmd flags which may confuse Cordova [#83](https://github.com/driftyco/ionic-cli/issues/83)
* Select available IP address prompt [#82](https://github.com/driftyco/ionic-cli/issues/82)
* Fix black screen on load [#81](https://github.com/driftyco/ionic-cli/issues/81)


### 1.2.0

* LiveReload from a native app during development
* Option to print out console logs to the terminal
* Option to print out server logs to the terminal
* Start Ionic projects from Codepen urls
* [Live Reload All the Things: Ionic CLI's Latest Features](http://ionicframework.com/blog/live-reload-all-things-ionic-cli/)
