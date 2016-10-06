[![Build Status][circle-badge]][circle-badge-url]
[![Build status][appveyor-badge]][appveyor-badge-url]
[![npm][npm-badge]][npm-badge-url]

# Ionic-Cli

The Ionic Framework command line utility makes it easy to start, build, run, and emulate [Ionic](http://ionicframework.com/) apps. In addition, it comes with (optional!) integration with the [Ionic Cloud](http://ionic.io/), a set of mobile backend services perfect for Ionic apps.

Use the `ionic --help` command for more detailed task information.

## Installing

```bash
$ npm install -g ionic
```

*Note: For a global install of `-g ionic`, OSX/Linux users may need to prefix the command with `sudo` or can setup [proper file permissions on OSX for npm](http://www.johnpapa.net/how-to-use-npm-global-without-sudo-on-osx/) to install without `sudo`.*


Minimal node requirements:

- NodeLTS or greater
- NPM 3x



## Starting an Ionic App

To start a Ionic 1x app, run:

```bash
$ ionic start myapp [template]
```

To start a Ionic 2 app, run:

```bash
$ ionic start myapp [template] --v2
```

Starter templates can either come from a named template, a Github repo, a Codepen, or a local directory. A starter template is what becomes the `www` directory for a V1 project, and a `src` directory for a V2 project

__Named V1 template starters:__

* [tabs](https://github.com/driftyco/ionic-starter-tabs) (Default)
* [sidemenu](https://github.com/driftyco/ionic-starter-sidemenu)
* [maps](https://github.com/driftyco/ionic-starter-maps)
* [salesforce](https://github.com/driftyco/ionic-starter-salesforce)
* [blank](https://github.com/driftyco/ionic-starter-blank)

__Named V2 template starters:__

* [tabs](https://github.com/driftyco/ionic2-starter-tabs) (Default)
* [sidemenu](https://github.com/driftyco/ionic2-starter-sidemenu)
* [blank](https://github.com/driftyco/ionic2-starter-blank)


__Github Repo starters:__

* Any Github repo url, ex: [https://github.com/driftyco/ionic-starter-tabs](https://github.com/driftyco/ionic-starter-tabs)
* Named templates are simply aliases to Ionic starter repos

__Codepen URL starters:__

* Any Codepen url, ex: [http://codepen.io/ionic/pen/odqCz](http://codepen.io/ionic/pen/odqCz)
* [Ionic Codepen Demos](http://codepen.io/ionic/public-list/)

__Plunker URL starters:__

* Any Plunker url, ex: [http://embed.plnkr.co/dFvL8n/preview](http://embed.plnkr.co/dFvL8n/preview)

__Local directory starters:__

* Relative or absolute path to a local directory

__Command-line flags/options:__

    [--appname|-a]  .......  Human readable name for the app
                             (Use quotes around the name)
    [--id|-i]  ............  Package name set in the <widget id> config
                             ex: com.mycompany.myapp
    [--no-cordova|-w]  ....  Do not create an app targeted for Cordova
    [--sass|-s] ...........  Setup the project to use Sass CSS precompiling (V1 only)
    [--list|-l]  ..........  List starter templates available

    [--io-app-id] .........  The Ionic.io app ID to use

## Adding a platform target

```bash
$ ionic platform ios android
```

## Testing in a Browser

Use `ionic serve` to start a local development server for app dev and testing. Additionally, this command starts LiveReload which is used to monitor changes in the file system. As soon as you save a file the browser is refreshed automatically. View [Using Sass](https://github.com/driftyco/ionic-cli/blob/master/README.md#using-sass) if you would also like to have `ionic serve` watch the project's Sass files.

```bash
$ ionic serve [options]
```

## Building your app

```bash
$ ionic build ios
```

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

### Generating Exact Platform Resources

By default the `ionic resources` command will automatically figure out which platforms it should generate according to what platforms have been added to your project. However, you can also explicitly state which resources should be built by providing a platform name in the command. The example below would generate only `ios` resources (even if the platform hasn't been added to the project).

```bash
$ ionic resources ios
```

### Default Ionic Resources

Ionic provides you some default icons and splash screens to give you a better idea of how to size your icons and splashscreen, as well as how to modify your config.xml file for your own icons.

```bash
$ ionic resources --default
```

If you already have a resources directory, the command above will not over write your files. If you wish to force an over write, use `ionic resources --default --force`.

When starting a new app and adding a platform `ionic platform add ios` - the default icons and splashscreens will be downloaded and your config.xml will be modified to set up the default resources. This should help you identify your Ionic apps easier as well as help you get the file structure and configuration correct.


## Crosswalk for Android

To install [Crosswalk](https://crosswalk-project.org/) for Android run:

```bash
ionic plugin add cordova-plugin-crosswalk-webview --save
```

All that is left is to run the project as normal - `ionic run android`.

## Advanced serve options

__LiveReload__

By default, for Ionic 1 projects, LiveReload will watch for changes in your `www/` directory,
excluding `www/lib/`.  To change this, you can specify a `watchPatterns`
property in the `ionic.config.json` file located in your project root to watch
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

__Gulp Integration__

When running `ionic serve`, you can have Ionic run any Gulp tasks you specify by putting them into a gulp task called `serve:before`:

```js
gulp.task('serve:before', ['sass', 'watch']);
```

Now, when you run `ionic serve`, it will run the `watch` task while starting the Ionic server.

If you would like to disable gulp from running during serve, pass the `--nogulp` option.

Your gulpfile must be named gulpfile.js or Gulpfile.js, there is currently no support for typescript, babel or coffeescript gulp files in the 2.0 CLI

NOTE For V1:

```bash
$ ionic setup sass
```

will add a `watchPatterns` propery with the default values to your `ionic.config.json`
file that you can then edit, in addition to the `serve:before` gulp task
described in the [Using Sass](https://github.com/driftyco/ionic-cli/blob/master/README.md#using-sass) section.


__Service Proxies:__

The `serve` command can add some proxies to the http server. These proxies are useful if you are developing in the browser and you need to make calls to an external API. With this feature you can proxy request to the external api through the ionic http server preventing the `No 'Access-Control-Allow-Origin' header is present on the requested resource` error.

In the `ionic.config.json` file you can add a property with an array of proxies you want to add. The proxies are object with the following properties:

* `path`: string that will be matched against the beginning of the incoming request URL.
* `proxyUrl`: a string with the url of where the proxied request should go.
* `proxyNoAgent`: (optional) true/false, if true opts out of connection pooling, see [HttpAgent](http://nodejs.org/api/http.html#http_class_http_agent)

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
    [--lab] .................  Serves both iOS and Android in the browser
    [--nogulp] ..............  Serve without running gulp tasks
    [--platform|-t] .........  Serve the platform specific styles in the browser (ios/android)

## Using Ionic Labs

We've extended the serve command to open the new Lab UI that features iOS, Android, and Windows side-by-side.

```bash
$ ionic serve --lab
```

If you've used the serve command before, you'll feel right at home with this one. Just like serve, it opens your app in a browser, but now it shows you what your app will look like on a phone, with both iOS, Android, Windows side by side.

And of course, it supports Live Reload and all the other goodies we've added over the last couple of months.

NOTE: This does **not** emulate cordova or cordova plugins. So while the UI may feel like a native app, you'll still want to deploy to a device to test plugins.

## Serving an alternate document root

If you'd like to test your app in the browser and you use a folder other than the default of `www`, you can specify this folder in your `ionic.config.json` file.

You might also want to have the document root be created if you use some sort of build system, we suggest using `createDocumentRoot` for that so that `ionic serve` will create that folder for you.

It is also advised you specify the watch patterns for this document root as well, as follows:

```json
{
  "name": "SmoothRiders",
  "documentRoot": "app",
  "createDocumentRoot": "app",
  "watchPatterns": [
    "app/js/*",
    "!app/css/**/*"
  ]
}

```

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


## Using Sass (V1 Only)

By default, V1 starter projects are hooked up to Ionic's precompiled CSS file, which is found in the project's `www/lib/ionic/css` directory, and is linked to the app in the head of the root `index.html` file. However, projects can also be customized using [Sass](http://sass-lang.com/), which gives developers and designers "superpowers" in terms of creating and maintaining CSS. Below are two ways to setup Sass for your Ionic project (the `ionic setup sass` command simply does the manual steps for you). Once Sass has been setup for your Ionic project, then the `ionic serve` command will also watch for Sass changes.

For V2 projects, there's nothing you need to do! Ionic 2 projects by default are setup with sass and come with all the build process enabled.

#### Setup Sass Automatically (V1)

    ionic setup sass


#### Setup Sass Manually (V1)

1. Run `npm install` from the working directory of an Ionic project. This will install [gulp.js](http://gulpjs.com/) and a few handy tasks, such as [gulp-sass](https://www.npmjs.org/package/gulp-sass) and [gulp-minify-css](https://www.npmjs.org/package/gulp-minify-css).
2. Remove `<link href="lib/ionic/css/ionic.css" rel="stylesheet">` from the `<head>` of the root `index.html` file.
3. Remove `<link href="css/style.css" rel="stylesheet">` from the `<head>` of the root `index.html` file.
4. Add `<link href="css/ionic.app.css" rel="stylesheet">` to the `<head>` of the root `index.html` file.
5. In your `serve:before` gulp task, add the `sass` task `gulp.task('serve:before', ['sass', 'watch']);` (this can also be customized to whatever gulp tasks you'd like).


# Ionic Cloud services

The CLI integrates with Ionic Cloud, a set of backend services that integrate perfectly with Ionic apps. To get started, [visit the Ionic Cloud homepage](http://ionic.io) and [sign up](https://apps.ionic.io/signup).

There are a few things you can utilize the CLI for to support ease of development.

## Login

Type `ionic login` to get logged in the CLI.

### Login without prompt

You can pass the email and password to login without being prompted for email and password.

`ionic login --email user@ionic.io --password somepass`

### Login with environment variables

The CLI also supports settings environment variables to read off the email and password for the user.

Set `IONIC_EMAIL` and `IONIC_PASSWORD` as variables to have the CLI read these instead of being prompted for them.

## Upload your Ionic app

Use the `ionic upload` command to take your current application you are developing and upload it to the Ionic.io servers.

Now you can use [the ionic view app](http://view.ionic.io/) to view that application or have others view the application.

After uploading the application, you will see a message:


```
Uploading app....

Successfully uploaded (f23j9fjs)
```

This indicates you uploaded the application correctly, and the App ID is set to `f23j9fjs`.

You can then view that App ID from the View app or the application listing on your [Ionic Cloud dashboard](http://apps.ionic.io/).

### Adding a note with your upload

To add a note to your build, pass the `--note` option as follows:

`ionic upload --note "This version of the application fixes the menu selections"`.

## Set your Ionic Project App ID manually

Use the `ionic link <appId>` command to set your Ionic App ID to continue working with the same app with the Ionic platform across development enviroments.

## Share the application with another user

Use the `ionic share <email>` command to have an email sent to another person to have them view the Ionic application you are using. Note: You must have an [Ionic Cloud](http://ionic.io/) account as well as the user you are sharing with.

# Ionic Hooks (V1)

Ionic provides some default hooks for you to use in your Cordova application. In versions prior to 1.3.18, these hooks were automatically installed via the `ionic platform` command.

In 1.3.18, the hooks were automatically removed due to some errors users were having with Crosswalk and other plugins with variables.

If you were a user who would still like to use those hooks, you can re-install these hooks with the `ionic hooks add` command.

If you would like to remove these hooks yourself, use `ionic hooks remove` to get rid of them.


# Ionic CLI 2.0

## Ionic Generators

First class support has come to the Ionic CLI to scaffold and generate Ionic and Angular 2 components.

From your app directory, use the `generate` command (alias: `g`).

Usage:
* `ionic generate page About` - Generate a page named About with HTML, JavaScript, and Sass named `about`.
* `ionic g tabs MyTabPage` - Generate a page named MyTabPage, queries for the amount of tabs, and creates pages for those tabs.

List:

View all generators: `ionic g --list`.

[circle-badge]: https://circleci.com/gh/driftyco/ionic-cli.svg?style=shield
[circle-badge-url]: https://circleci.com/gh/driftyco/ionic-cli
[appveyor-badge]: https://ci.appveyor.com/api/projects/status/oqaqa7fdc7y9mma3?svg=true
[appveyor-badge-url]: https://ci.appveyor.com/project/jthoms1/ionic-cli
[npm-badge]: https://img.shields.io/npm/v/ionic.svg
[npm-badge-url]: https://www.npmjs.com/package/ionic
