# Change Log

All notable changes to this project will be documented in this file.
See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="1.4.1"></a>
## [1.4.1](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-plugin-cordova@1.4.0...@ionic/cli-plugin-cordova@1.4.1) (2017-07-11)




<a name="1.4.0"></a>
# [1.4.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-plugin-cordova@1.3.0...@ionic/cli-plugin-cordova@1.4.0) (2017-06-12)


### Bug Fixes

* **cordova:** actually show platform/type of missing resources ([4e154ed](https://github.com/ionic-team/ionic-cli/commit/4e154ed))
* **cordova:** skip Cordova telemetry gathering during ionic info ([7fcb7b3](https://github.com/ionic-team/ionic-cli/commit/7fcb7b3))
* **serve:** 0.0.0.0, but open localhost in local browser ([e337813](https://github.com/ionic-team/ionic-cli/commit/e337813))


### Features

* **hooks:** call npm script hooks ([e34fc34](https://github.com/ionic-team/ionic-cli/commit/e34fc34))




<a name="1.3.0"></a>
# [1.3.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-plugin-cordova@1.2.1...@ionic/cli-plugin-cordova@1.3.0) (2017-05-31)


### Bug Fixes

* **cordova:** more arg parsing fixes... ([4a75255](https://github.com/ionic-team/ionic-cli/commit/4a75255))




<a name="1.2.1"></a>
## [1.2.1](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-plugin-cordova@1.2.0...@ionic/cli-plugin-cordova@1.2.1) (2017-05-24)


### Bug Fixes

* **cordova:** fix arg parser ([94db925](https://github.com/ionic-team/ionic-cli/commit/94db925))
* **cordova:** show cordova cli output for build/compile/prepare ([a960c5a](https://github.com/ionic-team/ionic-cli/commit/a960c5a))




<a name="1.2.0"></a>
# [1.2.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-plugin-cordova@1.1.2...@ionic/cli-plugin-cordova@1.2.0) (2017-05-23)


### Bug Fixes

* **cordova:** allow --variable during plugin add ([892b5af](https://github.com/ionic-team/ionic-cli/commit/892b5af))
* **cordova:** do not hard-code plugins to install ([9a7eeb1](https://github.com/ionic-team/ionic-cli/commit/9a7eeb1))


### Features

* **flags:** --no-interactive mode, with --confirm/--no-confirm ([1966a0c](https://github.com/ionic-team/ionic-cli/commit/1966a0c))
* **flags:** add --quiet flag ([6268f0c](https://github.com/ionic-team/ionic-cli/commit/6268f0c))
* **info:** show installed cordova platforms ([df0500d](https://github.com/ionic-team/ionic-cli/commit/df0500d))




<a name="1.1.2"></a>
## [1.1.2](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-plugin-cordova@1.1.1...@ionic/cli-plugin-cordova@1.1.2) (2017-05-17)


### Bug Fixes

* **cordova:** restore resources.json in built package ([0cafe8b](https://github.com/ionic-team/ionic-cli/commit/0cafe8b))




<a name="1.1.1"></a>
## [1.1.1](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-plugin-cordova@1.1.0...@ionic/cli-plugin-cordova@1.1.1) (2017-05-16)


### Bug Fixes

* **plugins:** messaging about globally installed plugins ([def3891](https://github.com/ionic-team/ionic-cli/commit/def3891))




<a name="1.1.0"></a>
# [1.1.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-plugin-cordova@1.0.0...@ionic/cli-plugin-cordova@1.1.0) (2017-05-16)


### Bug Fixes

* **cordova:** give cordova options after -- separator (https://github.com/ionic-team/ionic-cli/issues/2254) ([256503e](https://github.com/ionic-team/ionic-cli/commit/256503e))
* **cordova:** have prepare check config.xml for platforms, not dirs (fixes https://github.com/ionic-team/ionic-cli/issues/2253) ([8fcb0a8](https://github.com/ionic-team/ionic-cli/commit/8fcb0a8))
* **cordova:** trim whitespace around response ([6faae1b](https://github.com/ionic-team/ionic-cli/commit/6faae1b))


### Features

* **cordova:** create www directory automatically if missing (fixes https://github.com/ionic-team/ionic-cli/issues/2297) ([7836d55](https://github.com/ionic-team/ionic-cli/commit/7836d55))
* **cordova:** forward --aot, --minifyjs, and --minifycss to app-scripts ([4023352](https://github.com/ionic-team/ionic-cli/commit/4023352))
* **cordova:** forward --optimizejs to app-scripts ([a452cda](https://github.com/ionic-team/ionic-cli/commit/a452cda))
