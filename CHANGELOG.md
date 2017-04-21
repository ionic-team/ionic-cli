# Changelog

## Changes from CLI 2

* Removed commands: `setup`, `share`, `lib`, `io`, `security`, `push`,
  `package`, `config`, `service`, `add`, `remove`, `list`, `hooks`, `state`.
  Most removed commands provide legacy or broken functionality. `package` will
  be addressed in a later release. `state` should now [be managed entirely by
  Cordova](https://cordova.apache.org/docs/en/latest/platform_plugin_versioning_ref/).
* Added commands: `signup`. Signup will change in the future, but as for now it
  simply opens up the signup page.
* Cordova commands have been namespaced to allow for future platform support
  and to reduce clutter. Additionally, Cordova functionality has been moved
  into a CLI _plugin_, which is installed by default with new Ionic projects
  and can be installed in existing Ionic projects with `npm i --save
  @ionic/cli-plugin-cordova`.
* Many command arguments, options, and flags have changed. For example, the
  `--v1` and `--v2` flags in `ionic start` have been removed in favor of
  `--type` with respective values `ionic-angular` and `ionic1`. Please use
  `ionic help <commands>` for new command usage.
* `generate` command has been overhauled to interactively generate components,
  pages, directives, etc. It uses the power of
  [app-scripts](https://github.com/driftyco/ionic-app-scripts/) to hook up
  generated entities to your app. In the future, generators will continue to be
  expanded upon.

## Older Changes

Older changes (CLI 2 and before) can be viewed in the `2.x` branch's
[CHANGELOG.md](https://github.com/driftyco/ionic-cli/blob/2.x/CHANGELOG.md).
