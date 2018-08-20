# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

<a name="4.1.1"></a>
## [4.1.1](https://github.com/ionic-team/ionic-cli/compare/ionic@4.1.0...ionic@4.1.1) (2018-08-20)


### Bug Fixes

* **cordova:** respect --nosave for platform/plugin add ([eb4934b](https://github.com/ionic-team/ionic-cli/commit/eb4934b))
* **deploy:** exclude any existing pro-manifest.json files ([#3527](https://github.com/ionic-team/ionic-cli/issues/3527)) ([d03057d](https://github.com/ionic-team/ionic-cli/commit/d03057d))




<a name="4.1.0"></a>
# [4.1.0](https://github.com/ionic-team/ionic-cli/compare/ionic@4.0.6...ionic@4.1.0) (2018-08-15)


### Bug Fixes

* **capacitor:** pass in project/package id during start ([1357c5c](https://github.com/ionic-team/ionic-cli/commit/1357c5c))
* **cordova:** properly error for multiple IPs with non-interactive mode ([0346adc](https://github.com/ionic-team/ionic-cli/commit/0346adc))


### Features

* **capacitor:** add run command ([62a2918](https://github.com/ionic-team/ionic-cli/commit/62a2918))
* **capacitor:** document platform argument, prompt when required ([2a312ab](https://github.com/ionic-team/ionic-cli/commit/2a312ab))
* **capacitor:** install platform if missing ([9e29235](https://github.com/ionic-team/ionic-cli/commit/9e29235))
* **capacitor:** prompt for supported platforms when adding ([54c7d55](https://github.com/ionic-team/ionic-cli/commit/54c7d55))
* **capacitor:** unlock capacitor commands as beta ([2480a01](https://github.com/ionic-team/ionic-cli/commit/2480a01))




<a name="4.0.6"></a>
## [4.0.6](https://github.com/ionic-team/ionic-cli/compare/ionic@4.0.5...ionic@4.0.6) (2018-08-09)


### Bug Fixes

* **serve:** fix unclosed connection issue again ([#3500](https://github.com/ionic-team/ionic-cli/issues/3500)) ([1f0ef3b](https://github.com/ionic-team/ionic-cli/commit/1f0ef3b))




<a name="4.0.5"></a>
## [4.0.5](https://github.com/ionic-team/ionic-cli/compare/ionic@4.0.4...ionic@4.0.5) (2018-08-07)




**Note:** Version bump only for package ionic

<a name="4.0.4"></a>
## [4.0.4](https://github.com/ionic-team/ionic-cli/compare/ionic@4.0.3...ionic@4.0.4) (2018-08-06)


### Bug Fixes

* **serve:** properly cleanup child processes ([#3481](https://github.com/ionic-team/ionic-cli/issues/3481)) ([38217bf](https://github.com/ionic-team/ionic-cli/commit/38217bf))




<a name="4.0.3"></a>
## [4.0.3](https://github.com/ionic-team/ionic-cli/compare/ionic@4.0.2...ionic@4.0.3) (2018-08-02)


### Bug Fixes

* **build:** prompt to install "build cli" for all projects ([2862762](https://github.com/ionic-team/ionic-cli/commit/2862762))




<a name="4.0.2"></a>
## [4.0.2](https://github.com/ionic-team/ionic-cli/compare/ionic@4.0.1...ionic@4.0.2) (2018-07-30)


### Bug Fixes

* **cordova:** default to `cordova prepare` without platforms ([d40d961](https://github.com/ionic-team/ionic-cli/commit/d40d961))
* **resources:** fix hanging issue ([#3429](https://github.com/ionic-team/ionic-cli/issues/3429)) ([6b7c732](https://github.com/ionic-team/ionic-cli/commit/6b7c732))




<a name="4.0.1"></a>
## [4.0.1](https://github.com/ionic-team/ionic-cli/compare/ionic@4.0.0...ionic@4.0.1) (2018-07-26)


### Bug Fixes

* **generate:** remove pages/ prefix recommendation ([#3392](https://github.com/ionic-team/ionic-cli/issues/3392)) ([23d0db6](https://github.com/ionic-team/ionic-cli/commit/23d0db6))




<a name="4.0.0"></a>
# [4.0.0](https://github.com/ionic-team/ionic-cli/compare/ionic@4.0.0-rc.13...ionic@4.0.0) (2018-07-25)




**Note:** Version bump only for package ionic

This release offers support for :sparkles: **Ionic 4** :sparkles: (beta).

:memo: Use the new [CLI Documentation](https://beta.ionicframework.com/docs/cli/overview) on the beta framework documentation website for CLI 4.

#### :lollipop: Upgrading from CLI 3

Aside from a few edge cases listed below, upgrading to CLI 4 should be seamless.

**Ionic 2/3**: The CLI will continue working with apps using `@ionic/app-scripts` for tooling (please [update to the latest version](https://github.com/ionic-team/ionic-app-scripts) to avoid any issues). The CLI will continue to support projects that have yet to migrate to Ionic 4 w/ Angular CLI for tooling. For those who wish to migrate v3 apps to v4, see the [Migration Guide](https://beta.ionicframework.com/docs/building/migration).

**Ionic 1**: For Ionic 1 projects, a new toolkit has been introduced to slim down the main CLI package. All functionality is still supported, but the `@ionic/v1-toolkit` package needs to be installed.

#### :boom: Breaking Changes

* Support for legacy Ionic Cloud ended on January 31st, 2018. The `ionic upload` and `ionic package` commands have been removed from the CLI. Support for [Ionic Pro](https://ionicframework.com/pro/) will be a major focus for the CLI going forward. :ok_hand:
* The `app_id` property in `ionic.config.json` has been renamed to `pro_id` and is now optional (see [#3038](https://github.com/ionic-team/ionic-cli/issues/3038)). The CLI automatically detects this and changes it, but this notice is here if your build scripts rely on the setting.
* `ionic build` will no longer run `cordova prepare`. Instead, run `ionic cordova prepare <platform>`, which performs an Ionic build beforehand.
* Ionic Lab has been moved into the [`@ionic/lab`](https://github.com/ionic-team/ionic-cli/tree/develop/packages/@ionic/lab) package, which will need to be installed for Lab to work.
* The `conference` starter template has been removed from `ionic start`. To clone existing apps (as opposed to starting new apps from starter templates), please use the app's repository URL. For example, to create the conference app, use `ionic start "Conference App" https://github.com/ionic-team/ionic-conference-app`.
* The `--display-name` option for `ionic start` has been removed. The `name` argument is now used as the display name and slugified for directory name, package name, etc. To provide a custom slug, use `--project-id` (see [#3038](https://github.com/ionic-team/ionic-cli/issues/3038)).
* The `ionic:watch:before` npm script hook has been renamed to `ionic:serve:before`, but behaves the same.
* `ionic doctor check` will now _only_ print issues and exit with exit code 1 if issues are found. Use `ionic doctor treat` to attempt automatic fixes.
* `ionic doctor ignore` has been removed in favor of `ionic config set -g doctor.issues.<issue>.ignored true`).
* Ionic 1 build/serve functionality has been moved into the [`@ionic/v1-toolkit`](https://github.com/ionic-team/ionic-cli/tree/develop/packages/@ionic/v1-toolkit) package, which will need to be installed in your Ionic 1 project(s). The file watcher, [chokidar](https://github.com/paulmillr/chokidar), has been updated to 2.0.0, which will require those using `watchPatterns` to [always use POSIX-style slashes](https://github.com/paulmillr/chokidar/blob/master/CHANGELOG.md#chokidar-200-dec-29-2017) (not an issue if you've never used a backslash in globs for Windows).
* The gulp integration has been removed from the CLI and put into the [`@ionic/v1-toolkit`](https://github.com/ionic-team/ionic-cli/tree/develop/packages/@ionic/v1-toolkit) package, which is only for Ionic v1 apps.

#### :rocket: Enhancements

* `ionic s` is now an alias for `ionic serve`.
* No need for `@ionic/cli-plugin-proxy`. Proxy support is now built-in. Use existing environment variables or use `ionic config set -g proxy <url>`.
* New `ionic config unset` command for deleting config values.
* New `ionic doctor treat` command that attempts automatic fixes of detected issues.
* If `ionic:build` or `ionic:serve` npm scripts are defined in your `package.json`, the Ionic CLI will use them for the Ionic build/serve instead of the default for your project type.
* Automatic login via `IONIC_TOKEN` environment variable [#2410](https://github.com/ionic-team/ionic-cli/issues/2410)
* `--no-color` flag for turning off CLI colors
* `--no-build` option for `ionic cordova run` and `ionic cordova emulate` [#2930](https://github.com/ionic-team/ionic-cli/pull/2930)
* Better monorepo support. See the discussion in [#2232](https://github.com/ionic-team/ionic-cli/issues/2232).
* Multi-app support for new Angular projects [#3281](https://github.com/ionic-team/ionic-cli/issues/3281)
* Added experimental `ionic ssl generate` command for generating `localhost` SSL certificates for use with `ionic serve`. :memo: HTTPS support in `ionic serve` isn't quite finished yet (see [#3305](https://github.com/ionic-team/ionic-cli/issues/3305)).

#### :bug: Bug Fixes

* Interactivity is now disabled when not in a TTY. See [#3047](https://github.com/ionic-team/ionic-cli/issues/3047).
* Respect `--nosave` flag for `ionic cordova platform` and `ionic cordova plugin` [#2946](https://github.com/ionic-team/ionic-cli/issues/2946)
* Chain `--verbose` flag to Cordova for `ionic cordova` commands [#2919](https://github.com/ionic-team/ionic-cli/issues/2919)
* Fixed newlines in piped output from underlying CLIs.

#### :house: Internal

* A huge amount of code refactoring has been accomplished to prepare the CLI for a scalable, flexible future. Changes in behavior and help output based upon environment and config are now trivially accomplished.
* The [CLI Framework](https://github.com/ionic-team/ionic-cli/tree/develop/packages/%40ionic/cli-framework), a (currently) internal framework for building general-purpose command-line programs, has had many features added to support the utility CLIs such as `ionic-lab` and `ionic-v1`.
* Ionic Lab has been rebuilt using [StencilJS](https://stenciljs.com) and now works for any Ionic Framework version.

## Older Changes

* [3.x `CHANGELOG.md`](https://github.com/ionic-team/ionic-cli/blob/3.x/CHANGELOG.md)
* [1.x-2.x `CHANGELOG.md`](https://github.com/ionic-team/ionic-cli/blob/2.x/CHANGELOG.md)
