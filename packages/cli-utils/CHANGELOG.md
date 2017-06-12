# Change Log

All notable changes to this project will be documented in this file.
See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="1.4.0"></a>
# [1.4.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.3.0...@ionic/cli-utils@1.4.0) (2017-06-12)


### Bug Fixes

* **cordova:** actually show platform/type of missing resources ([4e154ed](https://github.com/ionic-team/ionic-cli/commit/4e154ed))
* **ionic1:** logger not logging changed files ([1b51529](https://github.com/ionic-team/ionic-cli/commit/1b51529))
* **plugins:** catch npm errors during updates and continue ([316826d](https://github.com/ionic-team/ionic-cli/commit/316826d))
* **serve:** running ionic serve in background ([883c21e](https://github.com/ionic-team/ionic-cli/commit/883c21e))


### Features

* **hooks:** call npm script hooks ([e34fc34](https://github.com/ionic-team/ionic-cli/commit/e34fc34))
* **plugins:** warn about multiple installed project plugins ([88789d8](https://github.com/ionic-team/ionic-cli/commit/88789d8))




<a name="1.3.0"></a>
# [1.3.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.2.0...@ionic/cli-utils@1.3.0) (2017-05-31)


### Bug Fixes

* **cordova:** more arg parsing fixes... ([4a75255](https://github.com/ionic-team/ionic-cli/commit/4a75255))
* **proxy:** use env load to ensure shared reference ([8552826](https://github.com/ionic-team/ionic-cli/commit/8552826))




<a name="1.2.0"></a>
# [1.2.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.1.2...@ionic/cli-utils@1.2.0) (2017-05-23)


### Bug Fixes

* **cli-plugin-ionic1:** use documentRoot and watchPatterns from ionic.config.json ([a878a95](https://github.com/ionic-team/ionic-cli/commit/a878a95))
* don't swallow subprocess stdout during --verbose ([d53d11a](https://github.com/ionic-team/ionic-cli/commit/d53d11a))
* **config:** Handle empty file ([fbcfc76](https://github.com/ionic-team/ionic-cli/commit/fbcfc76))
* **package:** dates not internationalized, use ISO ([0674bd9](https://github.com/ionic-team/ionic-cli/commit/0674bd9))


### Features

* **flags:** --no-interactive mode, with --confirm/--no-confirm ([1966a0c](https://github.com/ionic-team/ionic-cli/commit/1966a0c))
* **flags:** add --quiet flag ([6268f0c](https://github.com/ionic-team/ionic-cli/commit/6268f0c))
* **flags:** persistent "cli flags" ([72a9b45](https://github.com/ionic-team/ionic-cli/commit/72a9b45))
* **logging:** disable interval spinner for non-interactive mode ([9e4ed33](https://github.com/ionic-team/ionic-cli/commit/9e4ed33))
* **login:** automatic login via IONIC_EMAIL/IONIC_PASSWORD ([d8d26e4](https://github.com/ionic-team/ionic-cli/commit/d8d26e4))




<a name="1.1.2"></a>
## [1.1.2](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.1.1...@ionic/cli-utils@1.1.2) (2017-05-17)




<a name="1.1.1"></a>
## [1.1.1](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.1.0...@ionic/cli-utils@1.1.1) (2017-05-16)


### Bug Fixes

* **plugins:** messaging about globally installed plugins ([def3891](https://github.com/ionic-team/ionic-cli/commit/def3891))




<a name="1.1.0"></a>
# [1.1.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.0.0...@ionic/cli-utils@1.1.0) (2017-05-16)


### Bug Fixes

* prevent TypeError runtime error ([1283f49](https://github.com/ionic-team/ionic-cli/commit/1283f49))
* **cordova:** give cordova options after -- separator (https://github.com/ionic-team/ionic-cli/issues/2254) ([256503e](https://github.com/ionic-team/ionic-cli/commit/256503e))
* **upload:** rip out progress library (fixes https://github.com/ionic-team/ionic-cli/issues/2257) ([1559049](https://github.com/ionic-team/ionic-cli/commit/1559049))


### Features

* **proxy:** global proxy plugin for start/login ([be89cb1](https://github.com/ionic-team/ionic-cli/commit/be89cb1))
