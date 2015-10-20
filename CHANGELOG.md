### 1.7.7

* `ionic-app-lib` updated to `0.6.3`

### 1.7.6

* `ionic-app-lib` updated to `0.6.2`

### 1.7.5

* `ionic-app-lib` updated to `0.6.1`

### 1.7.4

* app-lib @0.6.0

### 1.7.3

* Updating app-lib dependency

### 1.7.2

* Updating app-lib dependency

### 1.7.1

* Fix incorrect passwords being sent in Android Credentials for security command.

### 1.7.0

* Added security command for managing Security Profiles.
* Added package command for Ionic Package.

### 1.6.5

* Updating app-lib dependency

### 1.6.4

* Updating app-lib dependency

### 1.6.3

* Updated tooltips for io command.

### 1.6.2

* Added `io init` command to initialize your project with ionic.io.
* Added config command to centralize ionic.io services configuration.
* Added `--deploy` flag to upload command. 

### 1.6.1

* Fix(share): Properly checking that the app exists with app id before attemping to upload. Fix login passing args to get from args or prompting.
* Fix(spelling): Fix spelling mistake of CLI output.

### 1.6.0

* Fix(upload): Bumped archiver back to 0.5.1 - it was causing an issue related to unzipped compressed files on Android devices - see: https://github.com/driftyco/ionic-cli/issues/494 and https://github.com/archiverjs/node-archiver/issues/113.
* Refactor(share): Share is now available in ionic-app-lib.
* Update serve method `start` to check for document root and reject promise if it does not exist instead of exiting process with Util.fail.
* Fix for upload - if you have a script with a query string, it will not get mangled from the removeCacheBusters call. Fixes issue https://github.com/driftyco/ionic-cli/issues/504.
* Fix(browser): Fix for remove crosswalk, pass in the app directory for the project file, then use that instance object to save. Fixes CLI bug https://github.com/driftyco/ionic-cli/issues/500.
* Fix(state): cordovaPlatforms in package.json no longer gets duplicate entry.
* Feature(start): add the ability to add bower packages to a starter project.
* Fix(start): Ensure appSetup.bower is set so that the appSetup.bower.length call doesnt cause a run time exception. Handle the exception thrown from initCordova in the chain by rethrowing the exception if the app setup process fails.
* Fix(platform): Remove console.log command from ionic-cordova-lib, bump to 5.1.5 to have that change.
* Fix(lab): Update preview.html to have utf-8 charset meta tag.
* Style(share): Show the finished message as green
* Fix(login): Remove lowercase of email.
* Feature(project): Expose project to module.
* Fix(upload): Remove entity parsing to fix https://github.com/driftyco/ionic-cli/issues/452#issuecomment-117376542
* Fix(info): Add check runtime call to show upgrade messages for dependencies that are not fulfilled.
* Fix(start): Ensure appSetup.bower is set so that the appSetup.bower.length call doesnt cause a run time exception. Handle the exception thrown from initCordova in the chain by rethrowing the exception if the app setup process fails.
* Fix(platform): Remove console.log command from ionic-cordova-lib, bump to 5.1.5 to have that change.
* Update ionic-cordova-lib to 5.1.4 for fix with cordova lib run propagating errors to callers.
* Fix for serve - directory root is using path.join instead of path.resolve.
* Add build platform to the cordova command. 
* Bump version of ionic-cordova-lib.

### 1.5.5

* Fix(start): Fetch codepen was trying to fetch invalid html/css/js files because of a leading '/'. The trailing slash has been removed.

### 1.5.4

* Fix for error adding Crosswalk to existing ionic project.

### 1.5.3

* Fix for login issue with share - now correctly prompts for ionic.io login.


### 1.5.2

* Fix for login issue with upload and push - now correctly prompts for ionic.io login.

### 1.5.1

* Fix for ionic serve to specify a browser.
* Added help test for ionic push - `ionic help push`.
* Added a plethora of tests for confidence in refactoring of the command options.
* Fix for the repeated "Ionic not Defined" error.
* Fix for ionic upload - removes the BOM (byte order mark) certain users were having - was leaving unwanted artifacts. This has been corrected.
* Fix to no longer run the hooks permissions on every cordova command.

### 1.5.0

* Fix for Project - now can work from any directory, not just a directory that contains a project.
* Fix for Ionic upload - you can now include a note - `ionic upload --note 'This build fixes the menu'`.
* Login command now exists in ionic-app-lib.
* Upload command now exists in ionic-app-lib.
* Setup command now exists in ionic-app-lib.
* Add 10.39.236.1 for crosswalk lite.
* Add in settings file to have settings across applications.
* Fix for `ionic start --io-app-id <app_id>` to properly add the app ID to the project file.

### 1.4.5

* Fix for `ionic browser remove crosswalk` - fix for passing arguments and app directory.
* Fix for `ionic browser upgrade crosswalk` - passes app directory correctly.

### 1.4.4

* Fix upload to now work behind proxies.
* Fix for start - now includes new plugin ID's for Cordova 5.0.
* Fix for serve - fixes argument short name for lab and platform.
* Ionic run with livereload now shows command tips before and after the cordova command completes.
* Fix for `ionic run -l --all` - now respects the all addresses to serve on 0.0.0.0.

### 1.4.3

* Patch an issue where the server commands are not working from the `ionic run` with livereload.

### 1.4.2

* Fixing a bug with serve that will duplicate console logging from the browser.
* Fix for a bug when serve wont start console logs with `--consolelogs` argument.
* Added flag `--platform` for serve command that opens the browser with those platform specific styles (android/ios).

### 1.4.1 

* Corrected a bug with ionic state restore command - it now properly passes the app directory to be fixed.
* Corrected landscape and portrait sizes for the resources command.

### 1.4.0

* Extracting core logic for the CLI into ionic-app-lib.
* Certain commands have been moved to the ionic-app-lib - notably: start, serve, hooks, info, browser, and some of cordova commands.
* Ionic serve now allows all IP addresses so you can access the server outside of your machine - use `ionic serve --all` or `ionic serve --address 0.0.0.0` to serve to all addresses.
* Ionic hooks have had some issues with permissions - those are now added in when an app is started. Also there is the `ionic hooks permissions` command to grant those hooks execute permissions.
* When starting an application on a Mac, the iOS platform will be automatically added.
* Ionic Browser command now reverts to using the Cordova CLI if CLI v5.0 is installed.
* Updating Crosswalk to have canary version 14.42.334.0.
* Crosswalk now contains the cordova whitelist by default.
* Ionic sass setup now checks that gulp is installed globally - and if not - tells the user how to set it up.
* Ionic serve command now has a `--nogulp` option to avoid running gulp on serve.

### 1.3.22

* Fix for the upload command to correct issues with the view app cachebuster

### 1.3.21

* Fix for Ionic default hooks permissions

### 1.3.20 

* Adding in a command with ionic start to provide an ionic io app ID. `ionic start --io-app-id <someid>`

### 1.3.19

* Added in the `ionic docs` command to assist you in getting Ionic docs opened faster from the CLI! View all with `ionic docs ls`, or type in your desired docs `ionic docs collectionRepeat`. Ionic docs will be opened for the version of Ionic that you are using in your project (ex RC0, RC1, etc).
* Added in the `ionic state` command to help organize your Cordova platforms and plugins by storing the information in the package.json file. Try out `ionic state save` and `ionic state restore`.
* Added in the `ionic hooks` command to help users deal with the default Ionic hooks. In 1.3.18, they were removed by default. That has been turned off, and now to opt-out, use `ionic hooks remove`, or to add back in `ionic hooks add`.
* Added in `--noresources` option for `ionic platform add` - to avoid getting the default Ionic resources.
* Updated default Crosswalk version to 12.41.296.5.
* Updated latest Cordova Android commits from Cordova master to fix various bugs.
* Updated latest Cordova Crosswalk Engine from master to fix various bugs.

### 1.3.18

* Added an option to `ionic serve` to specify a default browser for that Ionic project. `ionic serve --defaultBrowser safari`
* Added an option when adding platforms to not include the default Ionic cordova hooks - `ionic platform add ios --no-hook`
* Ionic CLI now removes some of the older cordova hooks that try to manage plugins - this is now handled by cordova.
* Added an argument to not add default Ionic icon and splash screen resources
* Modified the cordova run command to check for the platform passed - this should resolve issues users are having with crosswalk and android.

### 1.3.17

* Added in default Ionic icons and splashscreens for your iOS and Android applications! Try them out `ionic resources --default`.
* To note: if you have entries in your config.xml file for icons or splashscreens or files existing in your resources directory,
* neither the settings nor the directory will not be overridden.
* To force resource folder with the ionic icons, use `ionic resources --default --force`
* Added in the ability to start an Ionic application from a Plnkr url - try it `ionic start http://embed.plnkr.co/dFvL8n/preview`
* Fixed the no cordova option when using the shorthand `-w` - `ionic start -w folderX blank` should now work
* Ionic info will now look up your version of ios-deploy - which is needed for ios application deployments - `ionic info`


### 1.3.16

* Added the ability to share an Ionic app with another user via email `ionic share developer@theirdomain.com`

### 1.3.15

* Updated the `ionic link` command to work properly with the `--reset` option
* Fixed the `ionic run --livereload` on windows - now properly gives the prompt for server commands.
* Updated Crosswalk Versions for Canary 13.41.318.0 and beta of 12.41.296.4.
* Fixed the `ionic login` command to properly look at email addresses without lowercasing them.

### 1.3.14

* Fixing the `ionic emulate --livereload` and `ionic run --livereload` to continue to accept user input for server commands.
* Added the `ionic link` command to allow you to specify your Ionic App ID.

### 1.3.13

* Added the ionic.project property `createDocumentRoot` to aid users with build systems to create the folder and run tasks before calling serve.

### 1.3.12

* Explicitly state which platform resources should be built by providing a platform name in the command
* The serve command now allows you to specify a browser to open other than your default - `ionic serve --browser safari`
* The serve command now allows you to specify a path to start the browser in so you can go straight to what you want to test - `ionic serve -o /#/tab/dash`
* The serve command now checks for existing server and live reload ports before trying to start up servers. If either serve host/port is used, then the port is incremented and informs the user of the change, then starts the server to avoid Address conflicts.
* There was a bug when multiple addresses were available - it gave the option to select the address but immediately started listening to console commands for the server. This has been corrected, and now correctly prompts for the address.
* The serve command proxy now accepts another property `proxyNoAgent`: (optional) true/false, if true opts out of connection pooling, see [HttpAgent](http://nodejs.org/api/http.html#http_class_http_agent)
* Added in the `proxyNoAgent` property on `ionic.project` proxies to be true/false, if true opts out of connection pooling, see [HttpAgent](http://nodejs.org/api/http.html#http_class_http_agent)


### 1.3.11

* Updating task order in the CLI output for help - putting more important tasks at the top, and lesser used ones at the bottom.
* Updated README to have basic info at top, more advanced information at bottom.
* Bumping cordova-android to our fork version of c0.5.6 to have latest commits from the Cordova-android team.
* Bumping cordova-crosswalk-engine to our fork version of c0.6.2 for latest changes by the Mobile chrome team.
* Added option to have your livereload server run off the address passed from the `--address` argument.
* Updated README to have proper `ionic serve` flag for `--lab`
* Updated README to give user instructions to avoid using sudo.
* Changed module for opbeat to use forked version - `opbeat-ionic` that will help us log uncaught exceptions with ionic-cli and user environment runtime information

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
