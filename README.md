[![Build Status][circle-badge]][circle-badge-url]
[![Build status][appveyor-badge]][appveyor-badge-url]
[![npm][npm-badge]][npm-badge-url]

Ionic-Cli
=========

The Ionic Framework command line utility makes it easy to start, build, run, and emulate [Ionic](http://ionicframework.com/) apps.
In addition, it comes with (optional!)  integration with the [Ionic Cloud](http://ionic.io/), a set of mobile backend services perfect for Ionic apps.

Use the `ionic --help` command for more detailed task information.

## Installing

```bash
$ npm install -g ionic@beta
```

#### Upgrading from a previous beta
This process is a little cumbersome at the the moment (we will streamline this in the beta3 release).  You will need to the newly updated CLI globally and execute the following command in your Ionic project's root directory.
```bash
$ npm install -g @ionic/cli-plugin-cordova@beta @ionic/cli-plugin-core@beta
```

#### Latest beta release versions
 - ionic@3.0.0-beta.2
 - @ionic/cli-plugin-cordova@0.0.8
 - @ionic/cli-plugin-core@0.0.7


*Note: For a global install of `-g ionic`, OSX/Linux users may need to prefix the command with `sudo` or can 
setup [proper file permissions on OSX for npm](http://www.johnpapa.net/how-to-use-npm-global-without-sudo-on-osx/) to install without `sudo`. *

*Please ensure that you have NodeJS 6+ installed. This is the new LTS version of Node.*

# Ionic CLI v3 beta

We have rewritten the CLI from the ground up.  Our main focus was to:

1. Decrease the amount of time to the first *start* execution
2. Improve the responsiveness of every CLI command
3. Make the architecture flexible for future platform support (PWA, electron, etc.)
4. Provide better **help**, more guidance, and more feedback when executing commands.

In doing so we decided to take a new approach to the CLI's structure.  The base CLI installation now ships with commands that are common
all Ionic Applications. These include: *start*, *info*, *login*, *signup*, *help*, and *version*. All other commands
are specific to an Ionic project version.

So what does this mean for developers? There are now 2 common plugins that are installed when starting a new Ionic v2 project. These are **@ionic/cli-plugin-core** and
**@ionic/cli-plugin-cordova** (Below is a list of commands for each plugin). The **core** plugin contains commands that are common to all Ionic v2 projects and the **cordova**
plugin contains commands that are specific to creating applications with cordova.

If you use CLI v3 to start a new project these plugins are installed automatically. If you are using the CLI v3 on an existing project you will need to install these
new plugins within your project directory.

## Using CLI v3 - start a new project
```bash
$ npm install -g ionic@beta

$ ionic start myproject blank
```
*Note: If you do not pass an inputs to the start command you will get an interactive prompt that allows you to provide a name and select from a list of
starter templates.*

## Using CLI v3 - existing Ionic2 project

```bash
$ npm install --save-dev @ionic/cli-plugin-core@beta @ionic/cli-plugin-cordova@beta

$ ionic help
```

## Using CLI v3 - existing Ionic1 project

**We are currently developing a plugin for Ionic1 applications but it is currently not available for beta. Please note that if you install Ionic CLI v3 you will not
be able to work on Ionic1 applications until this plugin is released. Because of this we recommend that if you regularly work on Ionic1 applications you should
stick with Ionic CLI v2 for now.**

## Feedback

We are currently actively seeking feedback from those that use CLI v3 Beta.  If you have questions or issues please feel free to open
a new issue. Just be sure to note that you are using CLI v3 Beta.

If your question is about functionality please be sure to start with the help command.


# Additional Documentation
These markdown files contain the same documenation that is available through the `ionic help` command.

* [Ionic Global Commands](docs/ionic.md)
* [Core Project Commands](docs/cli-plugin-core.md)
* [Cordova Project Commands](docs/cli-plugin-cordova.md)

__Named template starters:__

* [blank](https://github.com/driftyco/ionic2-starter-blank)
* [tabs](https://github.com/driftyco/ionic2-starter-tabs) (Default)
* [sidemenu](https://github.com/driftyco/ionic2-starter-sidemenu)
* [conference](https://github.com/driftyco/ionic-conference-app)
* [tutorial](https://github.com/driftyco/ionis2-starter-tutorial)

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
$ ionic resources
```

If you already have a resources directory, the command above will not over write your files. If you wish to force an over write, use `ionic resources --default --force`.

When starting a new app and adding a platform `ionic platform add ios` - the default icons and splashscreens will be downloaded and your config.xml will be modified to set up the default resources. This should help you identify your Ionic apps easier as well as help you get the file structure and configuration correct.

__Service Proxies:__

The `serve` command can add some proxies to the http server. These proxies are useful if you are developing in the browser and you need to make calls to an external API. With this feature you can proxy request to the external api through the ionic http server preventing the `No 'Access-Control-Allow-Origin' header is present on the requested resource` error.

In the `ionic.project` file you can add a property with an array of proxies you want to add. The proxies are object with the following properties:

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

We've extended the serve command to open the new Lab UI that features iOS and Android side-by-side.

```bash
$ ionic serve --lab
```

If you've used the serve command before, you'll feel right at home with this one. Just like serve, it opens your app in a browser, but now it shows you what your app will look like on a phone, with both iOS and Android side by side.

And of course, it supports Live Reload and all the other goodies we've added over the last couple of months.


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


# Ionic Cloud services

The CLI integrates with Ionic Cloud, a set of backend services that integrate perfectly with Ionic apps. To get started, [visit the Ionic Cloud homepage](http://ionic.io) and [sign up](https://apps.ionic.io/signup).

There are a few things you can utilize the CLI for to support ease of development.

## Login

Type `ionic login` to get logged in the CLI.

### Login without prompt

You can pass the email and password to login without being prompted for email and password.

`ionic login user@ionic.io somepass`

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

# Ionic Docs

To get Ionic documentation from the Ionic CLI, try using the `ionic docs` command. The command will look up your currently used Ionic version and open the docs specific for that version. Ex: RC0, RC1, etc.

To view all docs, `ionic docs ls`.

To get help with a doc you may not remember, just type the name close enough: `ionic docs list` and you will be prompted for suggestions that may match.



# Ionic CLI 2.0

## Ionic Generators

First class support has come to the Ionic CLI to scaffold and generate Ionic and Angular 2 components. To use this feature, first install the V2 Ionic CLI: `npm install ionic@alpha` and start an app.

Once in the app folder, use the `generate` command (alias: `g`).

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
