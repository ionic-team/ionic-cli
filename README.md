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

__Command-line flags/options:__

    [--consolelogs|-c] ......  Print app console logs to Ionic CLI
    [--serverlogs|-s] .......  Print dev server logs to Ionic CLI
    [--port|-p] .............  Dev server HTTP port (8100 default)
    [--livereload-port|-i] ..  Live Reload port (35729 default)
    [--nobrowser|-b] ........  Disable launching a browser
    [--nolivereload|-r] .....  Do not start live reload


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


## Update Ionic lib

Update Ionic library files, which are found in the `www/lib/ionic` directory. If bower is being used
by the project, this command will automatically run `bower update ionic`, otherwise this command updates
the local static files from Ionic's CDN.

```bash
$ ionic lib update
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
