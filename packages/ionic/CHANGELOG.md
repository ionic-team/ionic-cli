# Changelog

<a name="4.0.0"></a>
### 4.0.0 (PENDING)

This release offers opt-in support for :sparkles: **Ionic Angular 4**
:sparkles:. Please be aware that [the
framework](https://github.com/ionic-team/ionic/tree/master/angular) is still in
early alpha. Opt-in to the new project type and help us test: [#3019
:heart_eyes:](https://github.com/ionic-team/ionic-cli/issues/3019)

This release also offers opt-in support for
[Capacitor](https://capacitor.ionicframework.com/), which is in alpha. Opt-in to
the new Capacitor commands and help us test:
[#3129 :muscle:](https://github.com/ionic-team/ionic-cli/issues/3129)

:memo: The [CLI documentation](https://ionicframework.com/docs/cli/) website is
out-of-date in some places with this new release. We're working on a brand new
docs website, but using `--help` provides the most recent and useful
documentation.

#### :lollipop: Upgrading from CLI v3

Aside from a few edge cases listed below, upgrading to CLI v4 should be
seamless.

**Ionic Angular v2/v3**: The CLI will continue working with apps using
`@ionic/app-scripts` for tooling. The CLI will continue to support projects that
have yet to migrate to Ionic Angular 4 w/ Angular CLI for tooling.

**Ionic 1**: For Ionic 1 projects, a new toolkit has been introduced to slim
down the main CLI package. All functionality is still supported, but the
`@ionic/v1-toolkit` package needs to be installed.

#### :boom: Breaking Changes

* Support for Legacy Ionic Cloud ended on January 31st, 2018. The `ionic upload`
  and `ionic package` commands have been removed from the CLI. Support for
  [Ionic Pro](https://ionicframework.com/pro/) will be a major focus for the CLI
  going forward. :ok_hand:
* The `app_id` property in `ionic.config.json` has been renamed to `pro_id` and
  is now optional (see
  [#3038](https://github.com/ionic-team/ionic-cli/issues/3038)). The CLI
  automatically detects this and changes it, but this notice is here if your
  build scripts rely on the setting.
* `ionic build` will no longer run `cordova prepare`. Instead, run `ionic
  cordova prepare [platform]`, which performs an Ionic build beforehand.
* Ionic Lab has been moved into the
  [`@ionic/lab`](https://github.com/ionic-team/ionic-cli/tree/master/packages/@ionic/lab)
  package, which will need to be installed for Lab to work.
* The `conference` starter template has been removed from `ionic start`. For
  cloning existing apps (as opposed to starting new apps from starter
  templates), please use the app's repository URL. For example, to create the
  conference app, use `ionic start "Conference App"
  https://github.com/ionic-team/ionic-conference-app`.
* The `--display-name` option for `ionic start` has been removed. The `name`
  argument is now used as the display name and slugified for directory name,
  package name, etc. To provide a custom slug, use `--project-id`.
* The `ionic:watch:before` npm script hook has been renamed to
  `ionic:serve:before`, but behaves the same.
* `ionic doctor check` will now _only_ print issues and exit with exit code 1 if
  issues are found. Use `ionic doctor treat` to attempt automatic fixes.
* `ionic doctor ignore` has been removed in favor of `ionic config set -g
  doctor.issues.<issue>.ignored true`).
* Ionic 1 build/serve functionality has been moved into the
  [`@ionic/v1-toolkit`](https://github.com/ionic-team/ionic-cli/tree/master/packages/@ionic/v1-toolkit)
  package, which will need to be installed in your Ionic 1 project(s). The file
  watcher, [chokidar](https://github.com/paulmillr/chokidar), has been updated
  to 2.0.0, which will require those using `watchPatterns` to [always use
  POSIX-style
  slashes](https://github.com/paulmillr/chokidar/blob/master/CHANGELOG.md#chokidar-200-dec-29-2017)
  (not an issue if you've never used `\` in globs for Windows).
* The gulp integration has been removed from the CLI and put into the
  [`@ionic/v1-toolkit`](https://github.com/ionic-team/ionic-cli/tree/master/packages/@ionic/v1-toolkit)
  package, which is only for Ionic v1 apps.

#### :rocket: Enhancements

* `ionic s` is now an alias for `ionic serve`.
* No need for `@ionic/cli-plugin-proxy`. Proxy support is now built-in. Use
  existing environment variables or use `ionic config set -g proxy <url>`.
* New `ionic config unset` command for deleting config values.
* New `ionic doctor treat` command that attempts automatic fixes of detected
  issues.
* If `ionic:build` or `ionic:serve` npm scripts are defined in your
  `package.json`, the Ionic CLI will use them for the Ionic build/serve instead
  of the default for your project type.
* Automatic login via `IONIC_TOKEN` environment variable
  [#2410](https://github.com/ionic-team/ionic-cli/issues/2410)
* `--no-color` flag for turning off CLI colors
* `--no-build` option for `ionic cordova run` and `ionic cordova emulate`
  [#2930](https://github.com/ionic-team/ionic-cli/pull/2930)
* Chain `--verbose` flag to Cordova for `ionic cordova` commands
  [#2919](https://github.com/ionic-team/ionic-cli/issues/2919)
* Better monorepo support. See the discussion in
  [#2232](https://github.com/ionic-team/ionic-cli/issues/2232).

#### :bug: Bug Fixes

* Interactivity is now disabled when not in a TTY. See
  [#3047](https://github.com/ionic-team/ionic-cli/issues/3047).
* Respect `--nosave` flag for `ionic cordova platform` and `ionic cordova
  plugin` [#2946](https://github.com/ionic-team/ionic-cli/issues/2946)

#### :house: Internal

* A huge amount of code refactoring has been accomplished to prepare the CLI for
  a scalable, flexible future. Changes in behavior and help output based upon
  environment and config are now trivially accomplished.
* The [CLI
  Framework](https://github.com/ionic-team/ionic-cli/tree/master/packages/%40ionic/cli-framework),
  a (currently) internal framework for building general-purpose command-line
  programs, has had many features added to support the utility CLIs such as
  `ionic-lab` and `ionic-v1`.
* Ionic Lab has been rebuilt using [StencilJS](https://stenciljs.com) and now
  works for any Ionic Framework version.

## Older Changes

* [3.x `CHANGELOG.md`](https://github.com/ionic-team/ionic-cli/blob/3.x/CHANGELOG.md)
* [1.x-2.x `CHANGELOG.md`](https://github.com/ionic-team/ionic-cli/blob/2.x/CHANGELOG.md)
