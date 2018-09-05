# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

<a name="2.2.1"></a>
## [2.2.1](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@2.2.0...@ionic/cli-utils@2.2.1) (2018-09-05)




**Note:** Version bump only for package @ionic/cli-utils

<a name="2.2.0"></a>
# [2.2.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@2.1.0...@ionic/cli-utils@2.2.0) (2018-08-20)


### Bug Fixes

* **cordova:** respect --nosave for platform/plugin add ([eb4934b](https://github.com/ionic-team/ionic-cli/commit/eb4934b))
* **shell:** allow output() to fail with original error ([e6a5bff](https://github.com/ionic-team/ionic-cli/commit/e6a5bff))
* **shell:** check if process is still alive before sending signal ([0ff1e48](https://github.com/ionic-team/ionic-cli/commit/0ff1e48))


### Features

* **info:** fall back to ANDROID_SDK_ROOT ([e9b0f29](https://github.com/ionic-team/ionic-cli/commit/e9b0f29))
* **info:** move SDK root inline ([79defc5](https://github.com/ionic-team/ionic-cli/commit/79defc5))




<a name="2.1.0"></a>
# [2.1.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@2.0.6...@ionic/cli-utils@2.1.0) (2018-08-15)


### Bug Fixes

* **capacitor:** pass in project/package id during start ([1357c5c](https://github.com/ionic-team/ionic-cli/commit/1357c5c))
* **cordova:** properly error for multiple IPs with non-interactive mode ([0346adc](https://github.com/ionic-team/ionic-cli/commit/0346adc))
* **cordova:** remove unwanted allow-navigation entries ([77984e1](https://github.com/ionic-team/ionic-cli/commit/77984e1))
* **info:** disable update check for cordova cli ([8310ff6](https://github.com/ionic-team/ionic-cli/commit/8310ff6))
* **info:** remove version.json warning for v1 ([78c3582](https://github.com/ionic-team/ionic-cli/commit/78c3582))
* **link:** support new repo association types ([1c1e1f1](https://github.com/ionic-team/ionic-cli/commit/1c1e1f1))


### Features

* **capacitor:** add run command ([62a2918](https://github.com/ionic-team/ionic-cli/commit/62a2918))
* **capacitor:** unlock capacitor commands as beta ([2480a01](https://github.com/ionic-team/ionic-cli/commit/2480a01))
* **info:** print whitelisted cordova plugins ([c266b7b](https://github.com/ionic-team/ionic-cli/commit/c266b7b))




<a name="2.0.6"></a>
## [2.0.6](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@2.0.5...@ionic/cli-utils@2.0.6) (2018-08-09)


### Bug Fixes

* **serve:** fix unclosed connection issue again ([#3500](https://github.com/ionic-team/ionic-cli/issues/3500)) ([1f0ef3b](https://github.com/ionic-team/ionic-cli/commit/1f0ef3b))




<a name="2.0.5"></a>
## [2.0.5](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@2.0.4...@ionic/cli-utils@2.0.5) (2018-08-07)




**Note:** Version bump only for package @ionic/cli-utils

<a name="2.0.4"></a>
## [2.0.4](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@2.0.3...@ionic/cli-utils@2.0.4) (2018-08-06)


### Bug Fixes

* **serve:** properly cleanup child processes ([#3481](https://github.com/ionic-team/ionic-cli/issues/3481)) ([38217bf](https://github.com/ionic-team/ionic-cli/commit/38217bf))




<a name="2.0.3"></a>
## [2.0.3](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@2.0.2...@ionic/cli-utils@2.0.3) (2018-08-02)


### Bug Fixes

* **build:** prompt to install "build cli" for all projects ([2862762](https://github.com/ionic-team/ionic-cli/commit/2862762))
* **serve:** await connectivity on specified host, not localhost ([#3444](https://github.com/ionic-team/ionic-cli/issues/3444)) ([bf10674](https://github.com/ionic-team/ionic-cli/commit/bf10674))
* **serve:** check all network interfaces for an available port ([30fd6ef](https://github.com/ionic-team/ionic-cli/commit/30fd6ef))
* **serve:** fix --livereload for device/emulator ([f31e79d](https://github.com/ionic-team/ionic-cli/commit/f31e79d))
* **serve:** use correct livereload port option for v1 ([bf3e775](https://github.com/ionic-team/ionic-cli/commit/bf3e775))




<a name="2.0.2"></a>
## [2.0.2](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@2.0.1...@ionic/cli-utils@2.0.2) (2018-07-30)


### Bug Fixes

* **build:** properly pass --target to remove fonts for cordova ([530d87a](https://github.com/ionic-team/ionic-cli/commit/530d87a))
* **generate:** run in current directory ([54c632b](https://github.com/ionic-team/ionic-cli/commit/54c632b))
* **info:** filter out hidden files/folders ([2e56dd7](https://github.com/ionic-team/ionic-cli/commit/2e56dd7))
* **info:** show 'not available' when cordova is missing ([db60879](https://github.com/ionic-team/ionic-cli/commit/db60879))
* **resources:** fix hanging issue ([#3429](https://github.com/ionic-team/ionic-cli/issues/3429)) ([6b7c732](https://github.com/ionic-team/ionic-cli/commit/6b7c732))




<a name="2.0.1"></a>
## [2.0.1](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@2.0.0...@ionic/cli-utils@2.0.1) (2018-07-26)


### Bug Fixes

* **generate:** remove pages/ prefix recommendation ([#3392](https://github.com/ionic-team/ionic-cli/issues/3392)) ([23d0db6](https://github.com/ionic-team/ionic-cli/commit/23d0db6))
* **help:** properly show option decorations ([b2509de](https://github.com/ionic-team/ionic-cli/commit/b2509de))




<a name="2.0.0"></a>
# [2.0.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@2.0.0-rc.13...@ionic/cli-utils@2.0.0) (2018-07-25)




**Note:** Version bump only for package @ionic/cli-utils
