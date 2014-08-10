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
$ ionic start myApp [template]
```

There are three choices of templates:

* Side-Menu (sidemenu)
* Tabs (tabs)
* Blank (blank)

Command-line flags/options:

    --app-name, -a  ........................  Human readable name for the app (Use quotes around the name)
    --id, -i  ..............................  Package name set in the <widget id> config, ie: com.mycompany.myapp
    --no-cordova, -w  ......................  Do not create an app targeted for Cordova


## Testing in a Browser

```bash
$ ionic serve
```


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

## Update Ionic lib

Update Ionic library files, which are found in the `www/lib/ionic` directory.

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

By default, starter projects are hooked up to Ionic's precompiled CSS file, which is found in the project's `www/lib/ionic/css` directory, and is linked to the app in the head of the root `index.html` file. However, Ionic projects can also be customized using [Sass](http://sass-lang.com/), which gives developers and designers "superpowers" in terms of creating and maintaining CSS. Please follow these steps if you would like to use Sass for an Ionic project:

1) Run `npm install` from the working directory of an Ionic project. This will install the [gulp.js](http://gulpjs.com/) build system and a few handy tasks, such as [gulp-sass](https://www.npmjs.org/package/gulp-sass) and [gulp-minify-css](https://www.npmjs.org/package/gulp-minify-css).
2) Remove `<link href="lib/ionic/css/ionic.css" rel="stylesheet">` from the `<head>` of the root `index.html` file.
3) Remove `<link href="css/style.css" rel="stylesheet">` from the `<head>` of the root `index.html` file.
4) Add `<link href="css/ionic.app.css" rel="stylesheet">` to the `<head>` of the root `index.html` file.
5) In the `ionic.project` file, add the JavaScript property `sass: true` to the object.

