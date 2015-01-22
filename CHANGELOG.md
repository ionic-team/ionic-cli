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
