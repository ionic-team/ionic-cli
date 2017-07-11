# Change Log

All notable changes to this project will be documented in this file.
See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="2.0.1"></a>
## [2.0.1](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-plugin-ionic1@2.0.0...@ionic/cli-plugin-ionic1@2.0.1) (2017-07-11)




<a name="2.0.0"></a>
# [2.0.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-plugin-ionic1@1.3.0...@ionic/cli-plugin-ionic1@2.0.0) (2017-06-12)


### Bug Fixes

* **ionic1:** logger not logging changed files ([1b51529](https://github.com/ionic-team/ionic-cli/commit/1b51529))
* **ionic1:** merge watch patterns with preset ([2773182](https://github.com/ionic-team/ionic-cli/commit/2773182))
* **serve:** 0.0.0.0, but open localhost in local browser ([e337813](https://github.com/ionic-team/ionic-cli/commit/e337813))


### Code Refactoring

* **ionic1:** remove gulp/sass logic ([706ecbb](https://github.com/ionic-team/ionic-cli/commit/706ecbb))


### BREAKING CHANGES

* **ionic1:** @ionic/cli-plugin-ionic1 will no longer run `gulp sass`
upon scss file changes. The default watch patterns have also been
changed to basically only watch `www/**/*`. To continue running `gulp
sass` during `ionic serve` with this plugin, there is now a CLI plugin
just for gulp! See the changelog for details:
https://github.com/ionic-team/ionic-cli/blob/master/CHANGELOG.md




<a name="1.3.0"></a>
# [1.3.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-plugin-ionic1@1.2.0...@ionic/cli-plugin-ionic1@1.3.0) (2017-05-31)




<a name="1.2.0"></a>
# [1.2.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-plugin-ionic1@1.1.2...@ionic/cli-plugin-ionic1@1.2.0) (2017-05-23)


### Bug Fixes

* **cli-plugin-ionic1:** use documentRoot and watchPatterns from ionic.config.json ([a878a95](https://github.com/ionic-team/ionic-cli/commit/a878a95))
* **ionic1:** allow livereload to bind to 0.0.0.0 ([e8a4245](https://github.com/ionic-team/ionic-cli/commit/e8a4245))


### Features

* **flags:** --no-interactive mode, with --confirm/--no-confirm ([1966a0c](https://github.com/ionic-team/ionic-cli/commit/1966a0c))
* **flags:** add --quiet flag ([6268f0c](https://github.com/ionic-team/ionic-cli/commit/6268f0c))




<a name="1.1.2"></a>
## [1.1.2](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-plugin-ionic1@1.1.1...@ionic/cli-plugin-ionic1@1.1.2) (2017-05-17)




<a name="1.1.1"></a>
## [1.1.1](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-plugin-ionic1@1.1.0...@ionic/cli-plugin-ionic1@1.1.1) (2017-05-16)


### Bug Fixes

* **plugins:** messaging about globally installed plugins ([def3891](https://github.com/ionic-team/ionic-cli/commit/def3891))




<a name="1.1.0"></a>
# [1.1.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-plugin-ionic1@1.0.0...@ionic/cli-plugin-ionic1@1.1.0) (2017-05-16)


### Bug Fixes

* **lab:** treat ios statusbar the same (fixes https://github.com/ionic-team/ionic-cli/issues/2268) ([c8f4e7e](https://github.com/ionic-team/ionic-cli/commit/c8f4e7e))
