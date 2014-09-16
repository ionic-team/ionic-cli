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
