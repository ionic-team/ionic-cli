# Changelog

<!--
<a name="4.x.0"></a>
### 4.x.0 (PENDING)

#### :rocket: Enhancements

* Support for :sparkles: **Ionic Angular v4** :sparkles:
* Ionic Angular v4 generators: page, component, directive, enum, guard,
  interface, class, module, pipe, service. Use `ionic g -h` for more info.
* `--ssl`/`-s` option added to `ionic serve` for Ionic Angular v4 projects. This
  will generate a self-signed certificate unless the `ssl.key` and `ssl.cert`
  project config settings are set. See `ionic serve --help`.
-->

<a name="4.0.0"></a>
### 4.0.0 (PENDING)

This release does **not** have full support for **Ionic Angular 4**. See the
[Ionic Framework repo](https://github.com/ionic-team/ionic) for updates. Want to
help test _the tooling_ for **Ionic Angular 4**? Opt-in to the new project type
and help us test: [#3019
:heart_eyes:](https://github.com/ionic-team/ionic-cli/issues/3019)

#### Upgrading from CLI v3

Aside from a few edge cases listed below, upgrading to CLI v4 should be
seamless.

**Ionic 1**: For Ionic 1 projects, a new toolkit has been introduced to slim
down the main CLI package. All functionality is still supported, but the
`@ionic/v1-toolkit` package needs to be installed.

#### :boom: Breaking Changes

* Support for Legacy Ionic Cloud ended on January 31st, 2018. The `ionic upload`
  and `ionic package` commands have been removed from the CLI. Support for
  [Ionic Pro](https://ionicframework.com/pro/) will be a major focus for the CLI
  going forward. :ok_hand:
* Ionic 1 build/serve functionality has been moved into the
  [`@ionic/v1-toolkit`](https://github.com/ionic-team/ionic-cli/tree/master/packages/@ionic/v1-toolkit)
  package, which will need to be installed in your Ionic 1 project(s). The file
  watcher, [chokidar](https://github.com/paulmillr/chokidar), has been updated
  to 2.0.0, which will require those using `watchPatterns` to [always use
  POSIX-style
  slashes](https://github.com/paulmillr/chokidar/blob/master/CHANGELOG.md#chokidar-200-dec-29-2017)
  (not an issue if you've never used `\` in globs for Windows).
* Ionic Lab has been moved into the
  [`@ionic/lab`](https://github.com/ionic-team/ionic-cli/tree/master/packages/@ionic/lab)
  package, which will need to be installed (globally or locally) for Lab to
  work.
* The gulp integration has been removed from the CLI and put into the
  [`@ionic/v1-toolkit`](https://github.com/ionic-team/ionic-cli/tree/master/packages/@ionic/v1-toolkit)
  package, which is only for Ionic v1 apps.
* The `conference` starter template has been removed from `ionic start`. For
  creating functional apps (as opposed to starting new apps from starter
  templates), please use the repository URL. For example, to create the
  conference app, use `ionic start <name>
  https://github.com/ionic-team/ionic-conference-app`.
* The `--display-name` option for `ionic start` has been removed. The `name`
  argument is now used as the display name and slugified for directory name,
  package name, etc. To provide a custom slug, use `--project-id`.
* The `--target` option for Cordova has been renamed to `--cordova-target` to
  disambiguate from the Angular CLI's `--target` option.
* The `app_id` property in `ionic.config.json` has been renamed to `pro_id` and
  is now optional (see
  [#3038](https://github.com/ionic-team/ionic-cli/issues/3038)). The CLI
  automatically detects this and changes it, but this notice is here if your
  build scripts rely on the setting.
* The `ionic:watch:before` npm script hook has been renamed to
  `ionic:serve:before`, but behaves the same.

#### :rocket: Enhancements

* `ionic s` is now an alias for `ionic serve`.
* New `ionic config unset` command for deleting config values.
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
