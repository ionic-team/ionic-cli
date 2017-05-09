# Changelog

## Changes from CLI 2

### Removed Commands

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
  Client](https://github.com/driftyco/ionic-cloud).
* `state`: The plugins and platforms can [be managed entirely by
  Cordova](https://cordova.apache.org/docs/en/latest/platform_plugin_versioning_ref/).
  Please remove the `cordovaPlatforms` and `cordovaPlugins` keys from your
  `package.json` file. If you're using Cordova 7, please [review the
  announcement](https://cordova.apache.org/news/2017/05/04/cordova-7.html)
  about how Cordova uses `config.xml` and `package.json` to manage plugins and
  platforms.

### Additional Changes

* Added commands: `signup`. Signup will change in the future, but as for now it
  simply opens up the signup page.
* Cordova commands have been namespaced to allow for future platform support
  and to reduce clutter. Additionally, Cordova functionality has been moved
  into a CLI _plugin_, which is installed by default with new Ionic projects
  and can be installed in existing Ionic projects with `npm i --save
  @ionic/cli-plugin-cordova`.
* Many command arguments, options, and flags have changed. For example, the
  `--v1` and `--v2` flags in `ionic start` have been removed in favor of
  `--type` with respective values `ionic1` (for v1) and `ionic-angular` (for
  latest Ionic Angular version). Please use `ionic help <commands>` for new
  command usage.
* `generate` command has been overhauled to interactively generate components,
  pages, directives, etc. It uses the power of
  [app-scripts](https://github.com/driftyco/ionic-app-scripts/) to hook up
  generated entities to your app. In the future, generators will continue to be
  expanded upon.

## Older Changes

Older changes (CLI 2 and before) can be viewed in the `2.x` branch's
[CHANGELOG.md](https://github.com/driftyco/ionic-cli/blob/2.x/CHANGELOG.md).
