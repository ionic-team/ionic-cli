Ionic-Cli
=========

The Ionic Framework command line utility makes it easy to start, build, run, and emulate [Ionic](http://ionicframework.com/) apps. In the future, it will also have support for our mobile development services and tools that make Ionic even more powerful.

Use the `ionic --help` command for more detailed task information.

## Installing

```bash
$ npm install -g ionic
```

*Note: For a global install of `-g ionic`, OSX/Linux users may need to prefix the command with `sudo`.*


## Starting an Ionic App

```bash
$ ionic start myapp [template]
```

Starter templates can either come from a named template, a Github repo, a Codepen, or a local directory. A starter template is what becomes the `www` directory within the Cordova project.

__Named template starters:__

* [tabs](https://github.com/driftyco/ionic-starter-tabs) (Default)
* [sidemenu](https://github.com/driftyco/ionic-starter-sidemenu)
* [blank](https://github.com/driftyco/ionic-starter-blank)

__Github Repo starters:__

* Any Github repo url, ex: [https://github.com/driftyco/ionic-starter-tabs](https://github.com/driftyco/ionic-starter-tabs)
* Named templates are simply aliases to Ionic starter repos

__Codepen URL starters:__

* Any Codepen url, ex: [http://codepen.io/ionic/pen/odqCz](http://codepen.io/ionic/pen/odqCz)
* [Ionic Codepen Demos](http://codepen.io/ionic/public-list/)

__Local directory starters:__

* Relative or absolute path to a local directory

__Command-line flags/options:__

    --appname, -a  .......  Human readable name for the app
                            (Use quotes around the name)
    --id, -i  ............  Package name set in the <widget id> config
                            ex: com.mycompany.myapp
    --no-cordova, -w  ....  Do not create an app targeted for Cordova


## Testing in a Browser

Use `ionic serve` to start a local development server for app dev and testing. This is useful for both desktop browser testing, and to test within a device browser which is connected to the same network. Additionally, this command starts LiveReload which is used to monitor changes in the file system. As soon as you save a file the browser is refreshed automatically. View [Using Sass](https://github.com/driftyco/ionic-cli/blob/master/README.md#using-sass) if you would also like to have `ionic serve` watch the project's Sass files.

```bash
$ ionic serve [options]
```

__LiveReload__

By default, LiveReload will watch for changes in your `www/` directory,
excluding `www/lib/`.  To change this, you can specify a `watchPatterns`
property in the `ionic.project` file located in your project root to watch
(or not watch) for specific changes.

```json
{
  "name": "myApp",
  "app_id": "",
  "watchPatterns": [
    "www/js/*",
    "!www/css/**/*"
  ]
}
```

For a reference on glob pattern syntax, check out
[globbing patterns](http://gruntjs.com/configuring-tasks#globbing-patterns) on
the Grunt website.

Note:

```bash
$ ionic setup sass
```

will add a `watchPatterns` propery with the default values to your `ionic.project`
file that you can then edit, in addition to the `gulpStartupTasks` property
described in the [Using Sass](https://github.com/driftyco/ionic-cli/blob/master/README.md#using-sass) section.


__Service Proxies:__

The `serve` command can add some proxies to the http server. These proxies are useful if you are developing in the browser and you need to make calls to an external API. With this feature you can proxy request to the external api through the ionic http server preventing the `No 'Access-Control-Allow-Origin' header is present on the requested resource` error.

In the `ionic.project` file you can add a property with an array of proxies you want to add. The proxies are object with two properties:

* `path`: string that will be matched against the beginning of the incoming request URL.
* `proxyUrl`: a string with the url of where the proxied request should go.

```json
{
  "name": "appname",
  "email": "",
  "app_id": "",
  "proxies": [
    {
      "path": "/v1",
      "proxyUrl": "https://api.instagram.com/v1"
    }
  ]
}

```

Using the above configuration, you can now make requests to your local server at `http://localhost:8100/v1` to have it proxy out requests to `https://api.instagram.com/v1`

For example:

```js
angular.module('starter.controllers', [])
.constant('InstagramApiUrl', '')
// .contant('InstagramApiUrl','https://api.instagram.com')
//In production, make this the real URL

.controller('FeedCtrl', function($scope, $http, InstagramApiUrl) {

  $scope.feed = null;

  $http.get(InstagramApiUrl + '/v1/media/search?client_id=1&lat=48&lng=2.294351').then(function(data) {
    console.log('data ' , data)
    $scope.feed = data;
  })

})
```

See also [this gist](https://gist.github.com/jbavari/d9c1c94058c4fdd4e935) for more help.

__Command-line flags/options:__

    [--consolelogs|-c] ......  Print app console logs to Ionic CLI
    [--serverlogs|-s] .......  Print dev server logs to Ionic CLI
    [--port|-p] .............  Dev server HTTP port (8100 default)
    [--livereload-port|-i] ..  Live Reload port (35729 default)
    [--nobrowser|-b] ........  Disable launching a browser
    [--nolivereload|-r] .....  Do not start live reload
    [--noproxy|-x] ..........  Do not add proxies
    [--address] .............  Serves in the browser at the specified address
    [--labs] ................  Serves both iOS and Android in the browser

## Using Ionic Labs

We've extended the serve command to open the new Lab UI that features iOS and Android side-by-side.

```bash
$ ionic serve --lab
```

If you've used the serve command before, you'll feel right at home with this one. Just like serve, it opens your app in a browser, but now it shows you what your app will look like on a phone, with both iOS and Android side by side.

And of course, it supports Live Reload and all the other goodies we've added over the last couple of months.

## Serving an alternate document root

If you'd like to test your app in the browser and you use a folder other than the default of `www`, you can specify this folder in your `ionic.project` file.

It is also advised you specify the watch patterns for this document root as well, as follows:

```json
{
  "name": "SmoothRiders",
   "gulpStartupTasks": [
    "watch"
  ],
  "documentRoot": "app",
  "watchPatterns": [
    "app/js/*",
    "!app/css/**/*"
  ]
}

```

## Adding a platform target

```bash
$ ionic platform ios android
```

## Building your app

```bash
$ ionic build ios
```

## Live Reload App During Development (beta)

The `run` or `emulate` command will deploy the app to the specified platform devices/emulators. You can also run __live reload__ on the specified platform device by adding the `--livereload` option. The live reload functionality is similar to `ionic serve`, but instead of developing and debugging an app using a standard browser, the compiled hybrid app itself is watching for any changes to its files and reloading the app when needed. This reduces the requirement to constantly rebuild the app for small changes. However, any changes to plugins will still require a full rebuild. For live reload to work, the dev machine and device must be on the same local network, and the device must support [web sockets](http://caniuse.com/websockets).

With live reload enabled, an app's console logs can also be printed to the terminal/command prompt by including the `--consolelogs` or `-c` option. Additionally, the development server's request logs can be printed out using `--serverlogs` or `-s` options.

__Command-line flags/options for `run` and `emulate`:__

    [--livereload|-l] .......  Live Reload app dev files from the device (beta)
    [--consolelogs|-c] ......  Print app console logs to Ionic CLI (live reload req.)
    [--serverlogs|-s] .......  Print dev server logs to Ionic CLI (live reload req.)
    [--port|-p] .............  Dev server HTTP port (8100 default, live reload req.)
    [--livereload-port|-i] ..  Live Reload port (35729 default, live reload req.)
    [--debug|--release]

While the server is running for live reload, you can use the following commands within the CLI:

    restart or r to restart the client app from the root
    goto or g and a url to have the app navigate to the given url
    consolelogs or c to enable/disable console log output
    serverlogs or s to enable/disable server log output
    quit or q to shutdown the server and exit


## Emulating your app

Deploys the Ionic app on specified platform emulator. This is simply an alias for `run --emulator`.

```bash
$ ionic emulate ios [options]
```


## Running your app

Deploys the Ionic app on specified platform devices. If a device is not found it'll then deploy to an emulator/simulator.

```bash
$ ionic run ios [options]
```

## Icon and Splash Screen Image Generation

[Automatically generate icons and splash screens](http://ionicframework.com/blog/automating-icons-and-splash-screens/) from source images to create each size needed for each platform, in addition to copying each resized and cropped image into each platform's resources directory. Source images can either be a `png`, `psd` __Photoshop__ or `ai` __Illustrator__ file. Images are generated using Ionic's image resizing and cropping server, instead of requiring special libraries and plugins to be installed locally.

Since each platform has different image requirements, it's best to make a source image for the largest size needed, and let the CLI do all the resizing, cropping and copying for you. Newly generated images will be placed in the `resources` directory at the root of the Cordova project. Additionally, the CLI will update and add the correct `<platform>` configs to the project's [config.xml](http://cordova.apache.org/docs/en/edge/config_ref_images.md.html#Icons%20and%20Splash%20Screens) file.

During the build process, Cordova (v3.6 or later) will look through the project's [config.xml](http://cordova.apache.org/docs/en/edge/config_ref_images.md.html#Icons%20and%20Splash%20Screens) file and copy the newly created resource images to the platform's specific resource folder. For example, Android's resource folder can be found in `platforms/android/res`, and iOS uses `platforms/ios/APP_NAME/Resources`.


### Icon Source Image

Save an `icon.png`, `icon.psd` or `icon.ai` file within the `resources` directory at the root of the Cordova project. The icon image's minimum dimensions should be 192x192 px, and should have __no__ rounded corners. Note that each platform will apply it's own mask and effects to the icons. For example, iOS will automatically apply it's custom rounded corners, so the source file should not already come with rounded corners. This [Photoshop icon template](http://code.ionicframework.com/resources/icon.psd) provides the recommended size and guidelines of the artwork's safe zone.

```bash
$ ionic resources --icon
```

- [Photoshop Icon Template](http://code.ionicframework.com/resources/icon.psd)


### Splash Screen Source Image

Save a `splash.png`, `splash.psd` or `splash.ai` file within the `resources` directory at the root of the Cordova project. Splash screen dimensions vary for each platform, device and orientation, so a square source image is required the generate each of various sizes. The source image's minimum dimensions should be 2208x2208 px, and its artwork should be centered within the square, knowning that each generated image will be center cropped into landscape and portait images. The splash screen's artwork should roughly fit within a center square (1200x1200 px). This [Photoshop splash screen template](http://code.ionicframework.com/resources/splash.psd) provides the recommended size and guidelines of the artwork's safe zone. Additionally, when the `Orientation` [preference config](http://cordova.apache.org/docs/en/edge/config_ref_index.md.html#The%20config.xml%20File_global_preferences) is set to either `landscape` or `portrait` mode, then only the necessary images will be generated.

```bash
$ ionic resources --splash
```

- [Photoshop Splash Screen Template](http://code.ionicframework.com/resources/splash.psd)


### Generating Icons and Splash Screens

To generate both icons and splash screens, follow the instructions above and run:

```bash
$ ionic resources
```

### Platform Specific Resource Images

One source image can be used to generate images for each platform by placing the file within the `resources` directory, such as `resources/icon.png`. To use different source images for individual platforms, place the source image in the respective platform's directory. For example, to use a different icon for Android, it should follow this path: `resources/android/icon.png`, and a different image for iOS would use this path: `resources/ios/icon.png`.

## Crosswalk for Android

In v1.3.0 and later, you can now specify which browser to use in your Cordova Android projects. Currently we only support [Crosswalk](https://crosswalk-project.org/) and have plans to support more browsers later.

Execute `ionic browser add crosswalk` to add the Crosswalk browser to your Android project. By default, this will install the `8.37.189.14` version of Crosswalk.

If you'd like to specify a different version of Crosswalk, run `ionic browser list` to see which browsers are available and what versions. Then run `ionic browser add crosswalk@10.39.235.15`.

All that is left is to run the project as normal - `ionic run android`.

*NOTE: To start with, we are only supporting stable versions of Crosswalk. We plan to add the beta and canary versions as we continue adding to this feature set*


## Update Ionic lib

Update Ionic library files, which are found in the `www/lib/ionic` directory. If bower is being used
by the project, this command will automatically run `bower update ionic`, otherwise this command updates
the local static files from Ionic's CDN.

```bash
$ ionic lib update
```
*Note: Using bower? This command does not update Ionic's dependencies. Run `bower update` to update Ionic and all of it's dependencies defined in `bower.json`.*

## Packaging an app (beta)

Using Ionic's service, you can compile and package your project into an app-store ready app without
requiring native SDKs on your machine.

```bash
$ ionic package debug android
```

The third argument can be either `debug` or `release`, and the last argument can be either `android` or `ios`.


## Cordova Commands

Ionic uses Cordova underneath, so you can also substitute Cordova commands to prepare/build/emulate/run, or to add additional plugins.

*Note: we occasionally send anonymous usage statistics to the Ionic team to make the tool better.*

## Working around proxies

If you have a proxy you need to get around, you can pass that proxy with the default `http_proxy` [node environment variable](https://www.npmjs.org/doc/misc/npm-config.html#proxy) or an environment variable `proxy`.

A few ways to set up and use the environment variable:

```bash
export http_proxy=internal.proxy.com
# Or
export PROXY=internal.proxy.com

ionic start my_app

# Additionally, pass in line
PROXY=internal.proxy.com ionic start my_app
```


## Using Sass

By default, starter projects are hooked up to Ionic's precompiled CSS file, which is found in the project's `www/lib/ionic/css` directory, and is linked to the app in the head of the root `index.html` file. However, Ionic projects can also be customized using [Sass](http://sass-lang.com/), which gives developers and designers "superpowers" in terms of creating and maintaining CSS. Below are two ways to setup Sass for your Ionic project (the `ionic setup sass` command simply does the manual steps for you). Once Sass has been setup for your Ionic project, then the `ionic serve` command will also watch for Sass changes.

#### Setup Sass Automatically

    ionic setup sass


#### Setup Sass Manually

1. Run `npm install` from the working directory of an Ionic project. This will install [gulp.js](http://gulpjs.com/) and a few handy tasks, such as [gulp-sass](https://www.npmjs.org/package/gulp-sass) and [gulp-minify-css](https://www.npmjs.org/package/gulp-minify-css).
2. Remove `<link href="lib/ionic/css/ionic.css" rel="stylesheet">` from the `<head>` of the root `index.html` file.
3. Remove `<link href="css/style.css" rel="stylesheet">` from the `<head>` of the root `index.html` file.
4. Add `<link href="css/ionic.app.css" rel="stylesheet">` to the `<head>` of the root `index.html` file.
5. In the `ionic.project` file, add the JavaScript property `"gulpStartupTasks": ["sass", "watch"]` (this can also be customized to whatever gulp tasks you'd like).
