# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
