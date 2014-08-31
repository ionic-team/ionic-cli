Ionic-Cli
=========

The Ionic Framework command line utility makes it easy to start, build, run, and emulate [Ionic](http://ionicframework.com/) apps. In the future, it will also have support for our mobile development services and tools that make Ionic even more powerful.

Use the `ionic --help` command for more detailed task information.

## Installing

```bash
$ sudo npm install -g ionic
```

## Starting an Ionic App

```bash
$ ionic start myapp [template]
```

Starter templates can either come from a named template, or from any Codepen URL.

Named template starters:

* [tabs](https://github.com/driftyco/ionic-starter-tabs) (Default)
* [sidemenu](https://github.com/driftyco/ionic-starter-sidemenu)
* [blank](https://github.com/driftyco/ionic-starter-blank)

Codepen URL starters:

* Any Codepen url, ex: [http://codepen.io/ionic/pen/odqCz](http://codepen.io/ionic/pen/odqCz)
* [Ionic Codepen Demos](http://codepen.io/ionic/public-list/)

Command-line flags/options:

    --app-name, -a  ......  Human readable name for the app
                            (Use quotes around the name)
    --id, -i  ............  Package name set in the <widget id> config
                            ex: com.mycompany.myapp
    --no-cordova, -w  ....  Do not create an app targeted for Cordova


## Testing in a Browser

Use `ionic serve` to start a local development server for app dev and testing. This is useful for both desktop browser testing, and to test within a device browser which is connected to the same network. Additionally, this command starts LiveReload which is used to monitor changes in the file system. As soon as you save a file the browser is refreshed automatically. View [Using Sass](https://github.com/driftyco/ionic-cli/blob/master/README.md#using-sass) if you would also like to have `ionic serve` watch the project's Sass files.

```bash
$ ionic serve [http-port] [livereload-port] [options]
```

Command-line flags/options:

    [--nobrowser|-b]  ......  Disable launching a browser
    [--nolivereload|-r]  ...  Do not start live reload


## Adding a platform target

```bash
$ ionic platform ios android
```

## Building your app

```bash
$ ionic build ios
```

## Emulating your app

```bash
$ ionic emulate ios
```

## Running your app

```bash
$ ionic run ios
```

Command-line flags/options:

    [--live-reload|-l]  ...  Live reload app dev files from the device (beta)
    [--debug|--release]

### Live Reload Within Cordova

The `run` command will deploy the app to the specified platform devices and emulators. You can also run __live reload__ on the specified platform device by adding the `--live-reload` option. The `run` command's live reload functionality is similar to `ionic serve`, but instead of using a standard browser, the Cordova app itself is watching for any changes to its files and reloading when needed. This reduces the requirement to constantly rebuild the Cordova app for small changes. However, any changes to plugins will still require a full rebuild.

In order for live reload to work, symlinks are automatically created and added to the `www` root, and the `<content src="index.html">` node in the config.xml file is updated to point to the dev server created by Ionic's CLI. On exit (by typing "exit" or using ctrl+c), the app's original settings will be restored and the symlinks should automatically be deleted. __Currently in beta__


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

Note: we occasionally send anonymous usage statistics to the Ionic team to make the tool better.


## Using Sass

By default, starter projects are hooked up to Ionic's precompiled CSS file, which is found in the project's `www/lib/ionic/css` directory, and is linked to the app in the head of the root `index.html` file. However, Ionic projects can also be customized using [Sass](http://sass-lang.com/), which gives developers and designers "superpowers" in terms of creating and maintaining CSS. Below are two ways to setup Sass for your Ionic project (the `ionic setup sass` command simply does the manual steps for you). Once Sass has been setup for your Ionic project, then the `ionic serve` command will also watch for Sass changes.

#### Setup Sass Automatically

    ionic setup sass


#### Setup Sass Manually

1. Run `npm install` from the working directory of an Ionic project. This will install [gulp.js](http://gulpjs.com/) and a few handy tasks, such as [gulp-sass](https://www.npmjs.org/package/gulp-sass) and [gulp-minify-css](https://www.npmjs.org/package/gulp-minify-css).
2. Remove `<link href="lib/ionic/css/ionic.css" rel="stylesheet">` from the `<head>` of the root `index.html` file.
3. Remove `<link href="css/style.css" rel="stylesheet">` from the `<head>` of the root `index.html` file.
4. Add `<link href="css/ionic.app.css" rel="stylesheet">` to the `<head>` of the root `index.html` file.
5. In the `ionic.project` file, add the JavaScript property `sass: true` to the object.
