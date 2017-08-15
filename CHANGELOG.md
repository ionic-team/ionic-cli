# Changelog

This is a curated CHANGELOG. We also use an automatic utility that maintains
the CHANGELOG files within CLI packages. For specific commit-level changes, see
[#packages](#packages). For big, high-level CLI changes, see
[#versions](#versions).

## Versions

<a name="3.8.1"></a>
### 3.8.1 (2017-08-14)

* Fixed an issue with Cordova serve improperly mocking `cordova.js` for Ionic
  Angular apps.

<a name="3.8.0"></a>
### 3.8.0 (2017-08-14)

* :trumpet: All functionality provided by the
  `@ionic/cli-plugin-ionic-angular`, `@ionic/cli-plugin-ionic1`,
  `@ionic/cli-plugin-cordova`, and `@ionic/cli-plugin-gulp` plugins has been
  moved into the core `ionic` package. The listed CLI plugins have been marked
  as deprecated. For the former two, project type is now detected and handled
  appropriately during `ionic build`, `ionic serve`, etc. For the latter two,
  integrations such as Cordova and Gulp are now detected and enabled
  automatically. See
  [README.md#integrations](https://github.com/ionic-team/ionic-cli/blob/master/README.md#integrations).
  The `@ionic/cli-plugin-proxy` plugin is unchanged. You are encouraged to
  uninstall the deprecated CLI plugins upon updating, as they are no longer
  needed and will not be loaded.
* With significantly fewer plugins, the update prompts are now inherently less
  annoying. Additionally, if you answer "no" to an update prompt, it will ask
  again in a day, instead of upon the next command.
* Fixed issue with multiple serve instances running at once on a computer.
* Added helpful messages for errant invocations of `ionic build`, `ionic
  state`, and `ionic share`.
* Added `--json` to `ionic config set` for stricter inputs, as well as
  `--force` to allow for overwriting arrays and objects, which normally would
  not be.
* During `ionic cordova platform add`, if an error from Cordova occurs because
  of the platform already having been added, `cordova platform save` is now run
  to persist platform engine specification to `config.xml`.
* Most `ionic cordova` commands now read the list of platforms from
  `config.xml`, so if the platform engine isn't listed, it attempts to install,
  at which point if an error occurs, it runs `cordova platform save`.
* Fixed `ionic cordova prepare` such that it no longer errors when platforms
  are not detected, it just does nothing, as there is nothing to do.

<a name="3.7.0"></a>
### 3.7.0 (2017-08-02)

* :tada: Added `ionic build` (finally). Now you can invoke a build for web
  assets and prepare them for platform targets. For Ionic/Cordova apps, this
  means running `cordova prepare` after the build, allowing you to use Android
  Studio or Xcode for native build/test/deploy. It is different from `ionic
  cordova build` in that it does not run `cordova build`. The native build must
  happen separately, if at all.
* Made `ionic cordova` commands friendlier to your `config.xml`. The Ionic CLI
  was formatting XML differently from Cordova, which resulted in an annoying
  set of changes which each command. Now we use the same XML library as Cordova
  with the same settings, so massive reformatting should be minimal.
* Added source image change detection to `ionic cordova resources`, which saves
  a checksum file (`.md5`) next to each source image. If the source image
  changes, the checksums will no longer match and the resources will be
  regenerated for that source image.
* Added `--json` option to `ionic config get`, `ionic package list`, and `ionic
  package info` for those using these commands programmatically.
* Fixed Windows bug for spawning the daemon process that was occasional with a
  wonky `node_modules`. Shoutout to [@imgx64](https://github.com/imgx64) for
  being so helpful!
* Allow `--address=localhost` with `ionic cordova` run/emulate commands. Some
  things are only possible when port forwarding from computer to device and
  using `localhost` as the "external" address that the device loads during
  livereload.
* `ionic cordova resources` and `ionic cordova platform` now respect the
  `Orientation` preference (see
  [Preferences](https://cordova.apache.org/docs/en/latest/config_ref/#preference)).
* Fixed `ionic serve` ignoring `-b` option when `--lab` was used.

<a name="3.6.0"></a>
### 3.6.0 (2017-07-27)

* Added prompt for local CLI installation. It is now required that the local
  CLI be installed to use local CLI plugins (which provide often necessary
  functionality such as `ionic serve`). You can use the global `ionic` binary
  from `npm i -g ionic` installation and it will use the local CLI version if
  installed, similar to gulp or other CLIs. The CLI is installed locally for
  new projects by default. See [this
  comment](https://github.com/ionic-team/ionic-cli/issues/2570#issuecomment-318571127)
  for detailed information.
* Added `ionic config` commands for getting and setting project
  (`ionic.config.json`) and global CLI config (`~/.ionic/config.json`) files.
  See
  [README.md#cli-config](https://github.com/ionic-team/ionic-cli/blob/master/README.md#cli-config).
* Removed `--no-timeouts`: All CLI timeouts have been removed, so the option is
  useless.
* Fixed odd behavior of `--no-interactive` and `--confirm`: the flags now work
  per-command and do not persist the mode.
* Moved update checking into an opt-in background process that checks npm for
  new versions. The CLI now simply reads a file of latest versions instead of
  doing network requests.
* Fixed CLI HTTP requests not being proxied for project commands. For this to
  work, the CLI and the proxy plugin must be installed locally. See
  [README.md#using-a-proxy](https://github.com/ionic-team/ionic-cli#using-a-proxy).
* Added `ionic logout` command. (Hidden for now.)
* Using `--no-interactive` will no longer prompt for CLI updates at all.
* Fixed issue with Ionic 1 not live-reloading in devices.
* Added `--no-build` option to `ionic cordova build` to skip Ionic builds.
* Added check for Android SDK Tools version during `ionic info`.
* Added `--no-module` option to Ionic Angular generators. By default, if
  applicable, components are generated with corresponding `@NgModule` classes
  which allow the component to be lazy-loaded. This new flag offers the ability
  to disable this feature.
* Added `--constants` option to Ionic Angular generators. If provided, a file
  will be generated that stores string constants for identifiers for
  lazy-loaded pages.

<a name="3.5.0"></a>
### 3.5.0 (2017-07-11)

* Added deploy metadata option for `ionic upload`. Thanks,
  [@harshabonthu](https://github.com/harshabonthu)!
* Added CI detection to switch CLI into non-interactive mode.
* Added logging for showing the execution of npm script hooks.
* Added better error messaging for gulpfile errors.
* Removed non-printing characters in the output of `ionic --version`.
* Fixed lack of error message for unknown generator types.
* Fixed incorrect interpretation of app IDs in scientific notation. (Only if
  you have a really unfortunate app_id such as `12345e10` :joy:). See
  [#2506](https://github.com/ionic-team/ionic-cli/issues/2506).

<a name="3.4.0"></a>
### 3.4.0 (2017-06-12)

* **Warning**: For Ionic 1 projects, the `sass` gulp task is no longer
  automatically run during SCSS file changes during `ionic serve`. See the
  bullet point below!
* Added CLI hooks that you can use to run code during CLI events using npm
  scripts. See
  [README.md#cli-hooks](https://github.com/ionic-team/ionic-cli/blob/master/README.md#cli-hooks)
  for usage.
* :tada: Added
  [`@ionic/cli-plugin-gulp`](https://github.com/ionic-team/ionic-cli/tree/master/packages/cli-plugin-gulp)!
  This plugin will hook into appropriately named gulp tasks during CLI events.
  It will also automatically run the `sass` gulp task during SCSS file changes
  during `ionic serve`. See the plugin's
  [README.md](https://github.com/ionic-team/ionic-cli/blob/master/packages/cli-plugin-gulp/README.md)
  for usage.
* Fixed an issue where `0.0.0.0` was the address being opened in the browser
  for Ionic 1 apps for server. Now the dev server still *binds* on `0.0.0.0` by
  default, but opens `localhost` in the browser.
* Fixed npm errors bubbling up during CLI update checks while offline.
* Improved `--help` descriptions of a few Cordova commands.

<a name="3.3.0"></a>
### 3.3.0 (2017-05-31)

* Added CLI flag for turning on/off timeouts: `--[no-]timeout`
* Added fuller descriptions to the `--help` output of individual commands.
* Improved Cordova argument parsing.
* Fixed the proxy plugin so `ionic start` works behind a corporate firewall.
* Improved CLI automatic update feature.

<a name="3.2.0"></a>
### 3.2.0 (2017-05-23)

* Added [CLI flags](https://github.com/ionic-team/ionic-cli#cli-flags), which
  change CLI behavior. There is now `--quiet`, `--[no-]interactive`
  (interactive/non-interactive mode), `--[no-]confirm`.
* Added non-interactive mode, which is useful for CI/CD servers. It disables
  "flair" such as spinners and unnecessary output. It also disables prompts.
* Added automatic login capability with `IONIC_EMAIL` and `IONIC_PASSWORD`
  environment variables.
* Added Cordova platforms to output of `ionic info`.
* (Somewhat) support `documentRoot` and `watchPatterns` (which are attributes
  of `ionic.config.json`) for Ionic 1 projects.
* If git is installed, new Ionic projects are automatically setup as
  repositories and an initial commit is made.

<a name="3.1.0"></a>
### 3.1.0 (2017-05-16)

* Added `--aot`, `--minifyjs`, `--minifycss`, `--optimizejs` flags for build
  commands of Ionic Angular projects.
* Fixed some runtime errors.
* Took out confirmation prompt for logging in again when already logged in.

<a name="3.0.0"></a>
### 3.0.0 (2017-05-09)

[CLI v3 Blog Post](https://blog.ionic.io/announcing-ionic-cli-v3/) :tada:

#### Upgrading from CLI v2

##### Required Changes

* If you're using Ionic Deploy, you'll need to update
  [`ionic-plugin-deploy`](https://github.com/ionic-team/ionic-plugin-deploy) to
  the latest version. See
  [#2237](https://github.com/ionic-team/ionic-cli/issues/2237) and
  [ionic-team/ionic-plugin-deploy#122](https://github.com/ionic-team/ionic-plugin-deploy/issues/122).

##### Removed Commands

* `setup`: This was only used to setup sass in Ionic 1 projects, which now is
  now handled in `start`.
* `share`: Please use the [Dashboard](https://apps.ionic.io/) to manage
  collaborators.
* `lib`, `add`, `remove`, `list`: For v1 projects, we recommend using
  [bower](https://bower.io/).
* `io`: Please configure apps in the [Dashboard](https://apps.ionic.io/) and
  use `link` to associate your local project.
* `security`: Please manage security profiles in the
  [Dashboard](https://apps.ionic.io/).
* `push`: Please manage push credentials (through security profiles) in the
  [Dashboard](https://apps.ionic.io/).
* `config`: Please manually edit the `ionic.config.json` file.
* `service`: Please migrate your app to use the [Ionic Cloud
  Client](https://github.com/ionic-team/ionic-cloud).
* `state`: The plugins and platforms can [be managed entirely by
  Cordova](https://cordova.apache.org/docs/en/latest/platform_plugin_versioning_ref/).
  Please remove the `cordovaPlatforms` and `cordovaPlugins` keys from your
  `package.json` file. If you're using Cordova 7, please [review the
  announcement](https://cordova.apache.org/news/2017/05/04/cordova-7.html)
  about how Cordova uses `config.xml` and `package.json` to manage plugins and
  platforms.

##### Additional Changes

* Added commands: `signup`. Signup will change in the future, but as for now it
  simply opens up the signup page.
* Cordova commands have been namespaced to allow for future platform support
  and to reduce clutter.
* Many command arguments, options, and flags have changed. For example, the
  `--v1` and `--v2` flags in `ionic start` have been removed in favor of
  `--type` with respective values `ionic1` (for v1) and `ionic-angular` (for
  latest Ionic Angular version). Please use `ionic help <commands>` for new
  command usage.
* `generate` command has been overhauled to interactively generate components,
  pages, directives, etc. It uses the power of
  [app-scripts](https://github.com/ionic-team/ionic-app-scripts/) to hook up
  generated entities to your app. In the future, generators will continue to be
  expanded upon.

## Packages

You can drill down into commit-level changes in the CHANGELOG files of each
package.

* [`ionic`](https://github.com/ionic-team/ionic-cli/blob/master/packages/ionic)
  ([CHANGELOG.md](https://github.com/ionic-team/ionic-cli/blob/master/packages/ionic/CHANGELOG.md))
* [`@ionic/cli-utils`](https://github.com/ionic-team/ionic-cli/blob/master/packages/@ionic/cli-utils)
  ([CHANGELOG.md](https://github.com/ionic-team/ionic-cli/blob/master/packages/@ionic/cli-utils/CHANGELOG.md))

**Plugins**:

* [`@ionic/cli-plugin-proxy`](https://github.com/ionic-team/ionic-cli/blob/master/packages/@ionic/cli-plugin-proxy)
  ([CHANGELOG.md](https://github.com/ionic-team/ionic-cli/blob/master/packages/@ionic/cli-plugin-proxy/CHANGELOG.md))

## Older Changes

Older changes (CLI 2 and before) can be viewed in the `2.x` branch's
[CHANGELOG.md](https://github.com/ionic-team/ionic-cli/blob/2.x/CHANGELOG.md).
