# Changelog

The Ionic CLI is made up of several packages, all of which have individual
CHANGELOG files. Changes made in one (especially `@ionic/cli-utils`) may affect
the other, but in general you can expect changes relating to Cordova to be made
in `@ionic/cli-plugin-cordova`, etc.

**Global**:

* [`ionic`](https://github.com/ionic-team/ionic-cli/blob/master/packages/ionic)
  ([CHANGELOG.md](https://github.com/ionic-team/ionic-cli/blob/master/packages/ionic/CHANGELOG.md)):
  The CLI executable.
* [`@ionic/cli-utils`](https://github.com/ionic-team/ionic-cli/blob/master/packages/cli-utils)
  ([CHANGELOG.md](https://github.com/ionic-team/ionic-cli/blob/master/packages/cli-utils/CHANGELOG.md)):
  The CLI utilities library.
* [`@ionic/cli-plugin-proxy`](https://github.com/ionic-team/ionic-cli/blob/master/packages/cli-plugin-proxy)
  ([CHANGELOG.md](https://github.com/ionic-team/ionic-cli/blob/master/packages/cli-plugin-proxy/CHANGELOG.md)):
  The plugin for proxying CLI requests through a firewall.

**Local** (per project):

* [`@ionic/cli-plugin-cordova`](https://github.com/ionic-team/ionic-cli/blob/master/packages/cli-plugin-cordova)
  ([CHANGELOG.md](https://github.com/ionic-team/ionic-cli/blob/master/packages/cli-plugin-cordova/CHANGELOG.md)):
  The plugin for Cordova integration. Essential for an Ionic/Cordova app.
* [`@ionic/cli-plugin-ionic-angular`](https://github.com/ionic-team/ionic-cli/blob/master/packages/cli-plugin-ionic-angular)
  ([CHANGELOG.md](https://github.com/ionic-team/ionic-cli/blob/master/packages/cli-plugin-ionic-angular/CHANGELOG.md)):
  The project plugin for Ionic Angular projects. Provides useful build tools
  and generators.
* [`@ionic/cli-plugin-ionic1`](https://github.com/ionic-team/ionic-cli/blob/master/packages/cli-plugin-ionic1)
  ([CHANGELOG.md](https://github.com/ionic-team/ionic-cli/blob/master/packages/cli-plugin-ionic1/CHANGELOG.md)):
  The project plugin for Ionic 1 that has functionality ported from the legacy
  CLI.

## CLI v3

[CLI v3 Blog Post](https://blog.ionic.io/announcing-ionic-cli-v3/) :tada:

### Upgrading from CLI v2

#### Required Changes

* If you're using Ionic Deploy, you'll need to update
  [`ionic-plugin-deploy`](https://github.com/ionic-team/ionic-plugin-deploy) to
  the latest version. See
  [#2237](https://github.com/ionic-team/ionic-cli/issues/2237) and
  [ionic-team/ionic-plugin-deploy#122](https://github.com/ionic-team/ionic-plugin-deploy/issues/122).

#### Removed Commands

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

#### Additional Changes

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
  [app-scripts](https://github.com/ionic-team/ionic-app-scripts/) to hook up
  generated entities to your app. In the future, generators will continue to be
  expanded upon.

## Older Changes

Older changes (CLI 2 and before) can be viewed in the `2.x` branch's
[CHANGELOG.md](https://github.com/ionic-team/ionic-cli/blob/2.x/CHANGELOG.md).
