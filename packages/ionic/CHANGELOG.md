# Change Log

All notable changes to this project will be documented in this file.
See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="3.5.0"></a>
# [3.5.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.4.0...ionic@3.5.0) (2017-07-11)


### Bug Fixes

* **generate:** error on unknown generator ([fb20896](https://github.com/ionic-team/ionic-cli/commit/fb20896))
* **hooks:** show execution of npm script hooks ([e838a5d](https://github.com/ionic-team/ionic-cli/commit/e838a5d))
* **link:** disable interpretation of scientific notation ([3874ca6](https://github.com/ionic-team/ionic-cli/commit/3874ca6))
* **start:** substitute invalid package.json name for MyApp ([ce6c129](https://github.com/ionic-team/ionic-cli/commit/ce6c129))
* **version:** quickfix for control chars in version ([cb448db](https://github.com/ionic-team/ionic-cli/commit/cb448db))


### Features

* automatically detect CI and switch to non-interactive mode ([113b254](https://github.com/ionic-team/ionic-cli/commit/113b254))
* **cloud:** add options for snapshot metadata ([75099e6](https://github.com/ionic-team/ionic-cli/commit/75099e6))




<a name="3.4.0"></a>
# [3.4.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.3.0...ionic@3.4.0) (2017-06-12)


### Bug Fixes

* **ionic1:** logger not logging changed files ([1b51529](https://github.com/ionic-team/ionic-cli/commit/1b51529))
* **serve:** running ionic serve in background ([883c21e](https://github.com/ionic-team/ionic-cli/commit/883c21e))
* **start:** save project name in package.json, not human-readable ([02b6c45](https://github.com/ionic-team/ionic-cli/commit/02b6c45))


### Features

* **hooks:** call npm script hooks ([e34fc34](https://github.com/ionic-team/ionic-cli/commit/e34fc34))
* **info:** show npm version ([044fcd7](https://github.com/ionic-team/ionic-cli/commit/044fcd7))
* **start:** add gulp plugin to new Ionic 1 apps by default ([de32fbb](https://github.com/ionic-team/ionic-cli/commit/de32fbb))




<a name="3.3.0"></a>
# [3.3.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.2.0...ionic@3.3.0) (2017-05-31)


### Bug Fixes

* **cordova:** more arg parsing fixes... ([4a75255](https://github.com/ionic-team/ionic-cli/commit/4a75255))
* **git:** no gpg signing ([5f40324](https://github.com/ionic-team/ionic-cli/commit/5f40324))
* **proxy:** use env load to ensure shared reference ([8552826](https://github.com/ionic-team/ionic-cli/commit/8552826))




<a name="3.2.0"></a>
# [3.2.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.1.2...ionic@3.2.0) (2017-05-23)


### Bug Fixes

* **cordova:** interpret --save as boolean ([7d7ca56](https://github.com/ionic-team/ionic-cli/commit/7d7ca56))
* **start:** validate prompted name ([221702c](https://github.com/ionic-team/ionic-cli/commit/221702c))


### Features

* **flags:** --no-interactive mode, with --confirm/--no-confirm ([1966a0c](https://github.com/ionic-team/ionic-cli/commit/1966a0c))
* **flags:** add --quiet flag ([6268f0c](https://github.com/ionic-team/ionic-cli/commit/6268f0c))
* **flags:** persistent "cli flags" ([72a9b45](https://github.com/ionic-team/ionic-cli/commit/72a9b45))
* **logging:** disable interval spinner for non-interactive mode ([9e4ed33](https://github.com/ionic-team/ionic-cli/commit/9e4ed33))
* **login:** automatic login via IONIC_EMAIL/IONIC_PASSWORD ([d8d26e4](https://github.com/ionic-team/ionic-cli/commit/d8d26e4))
* **start:** auto git setup, if available ([7f218f1](https://github.com/ionic-team/ionic-cli/commit/7f218f1))




<a name="3.1.2"></a>
## [3.1.2](https://github.com/ionic-team/ionic-cli/compare/ionic@3.1.1...ionic@3.1.2) (2017-05-17)


### Bug Fixes

* **cordova:** do not include cordova integration by default ([a2de983](https://github.com/ionic-team/ionic-cli/commit/a2de983))




<a name="3.1.1"></a>
## [3.1.1](https://github.com/ionic-team/ionic-cli/compare/ionic@3.1.0...ionic@3.1.1) (2017-05-16)




<a name="3.1.0"></a>
# [3.1.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.0.0...ionic@3.1.0) (2017-05-16)


### Bug Fixes

* **login:** just warn user about active session (fixes https://github.com/ionic-team/ionic-cli/issues/2299) ([eb5a614](https://github.com/ionic-team/ionic-cli/commit/eb5a614))
* **start:** increase download timeout to 3 minutes (fixes https://github.com/ionic-team/ionic-cli/issues/2256) ([001e53a](https://github.com/ionic-team/ionic-cli/commit/001e53a))
