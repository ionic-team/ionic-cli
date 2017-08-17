[![Build Status][circle-badge]][circle-badge-url]
[![npm][npm-badge]][npm-badge-url]

# Ionic CLI

The Ionic command line interface (CLI) is your go-to tool for developing
[Ionic][ionic-homepage] apps.

Use `ionic --help` for more detailed command information.

:mega: **Support/Questions?** Please see our [Support Page][ionic-support] for
general support questions. The issues on GitHub should be reserved for bug
reports and feature requests.

:sparkling_heart: **Want to contribute?** Please see
[CONTRIBUTING.md](https://github.com/ionic-team/ionic-cli/blob/master/CONTRIBUTING.md).

## Table of Contents ##

* [Requirements](#requirements)
* [Install](#install)
* [Getting Started](#getting-started)
* [Using Cordova](#using-cordova)
   * [Requirements](#requirements-1)
* [Integrations](#integrations)
* [Environment Variables](#environment-variables)
* [CLI Flags](#cli-flags)
* [CLI Config](#cli-config)
* [CLI Hooks](#cli-hooks)
   * [Example](#example)
* [Service Proxies](#service-proxies)
* [Using a Proxy](#using-a-proxy)
* [Legacy Version](#legacy-version)

## Requirements

* Node 6 LTS (latest)
* npm 3+

## Install

```bash
$ npm install -g ionic
```

:memo: *Note: For a global install `-g ionic`, macOS/Linux users may need to
prefix with `sudo` or can setup [proper file permissions for
npm](https://docs.npmjs.com/getting-started/fixing-npm-permissions).*

:memo: *Note: Running `ionic` will first look to see if you're in an Ionic
project. If you are, it runs the locally installed CLI, if installed.*

<a name="ionic-1"></a>
<a name="ionic-v1"></a>
<a name="ionic-angular"></a>
<a name="starter-templates"></a>
<a name="starter-templates-1"></a>

## Getting Started

New projects are started with the `ionic start` command. For full details and
examples, see:

```bash
ionic start --help
```

Here is a table of project types and links to their respective starter
templates:

| Project Type                            | Start Command                     | Starter Templates                                                                                                                                                                                      |
|-----------------------------------------|-----------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [**Ionic Angular**][ionic-angular-docs] | `ionic start myApp`               | [blank][ionic-angular-blank], [tabs][ionic-angular-tabs], [sidemenu][ionic-angular-sidemenu], [conference][ionic-angular-conference], [tutorial][ionic-angular-tutorial], [super][ionic-angular-super] |
| [**Ionic 1**][ionic1-docs]              | `ionic start myApp --type=ionic1` | [blank][ionic1-blank], [tabs][ionic1-tabs], [sidemenu][ionic1-sidemenu], [maps][ionic1-maps]                                                                                                           |

After you start your project, you can `cd` into the directory and serve it in
your browser:

```bash
cd ./myApp
ionic serve
```

## Using Cordova

Integrate Ionic with [Cordova](https://cordova.apache.org/) to bring native
capabilities to your app.

### Requirements

* For iOS development, see the [iOS Platform
  Guide](https://cordova.apache.org/docs/en/latest/guide/platforms/ios/index.html).
* For Android development, see the [Android Platform
  Guide](https://cordova.apache.org/docs/en/latest/guide/platforms/android/index.html).

```bash
$ npm install -g cordova
$ ionic cordova --help
$ ionic cordova run ios
```

## Integrations

As of CLI 3.8, the `@ionic/cli-plugin-cordova` and `@ionic/cli-plugin-gulp`
have been deprecated in favor of *integrations*. Integrations are automatically
detected and enabled, but can be easily disabled.

Integrations hook into CLI events. For example, when the Cordova integration is
enabled, `ionic cordova prepare` will run after `ionic build` runs. See [CLI
Hooks](#cli-hooks).

| integration | enabled when...                                           | disabled with...                                      |
| ------------|-----------------------------------------------------------|-------------------------------------------------------|
| Cordova     | `ionic cordova` commands are run                          | `ionic config set integrations.cordova.enabled false` |
| Gulp        | `gulp` exists in `devDependencies` of your `package.json` | `ionic config set integrations.gulp.enabled false`    |

## Environment Variables

The CLI will look for the following environment variables:

* `IONIC_CONFIG_DIRECTORY`: Where the CLI config files live. Defaults to
  `~/.ionic`. You may prefer `~/.config/ionic`.
* `IONIC_HTTP_PROXY`: Set a URL for proxying all CLI requests through. See
  [Using a Proxy](#using-a-proxy). The CLI will also look for `HTTP_PROXY` and
  `HTTPS_PROXY`, both of which npm use.
* `IONIC_EMAIL` / `IONIC_PASSWORD`: For automatic login via environment
  variables.

## CLI Flags

CLI flags are global options that alter the behavior of a CLI command.

* `--help`: Instead of running the command, view its help page.
* `--verbose`: Show all log messages for debugging purposes.
* `--quiet`: Only show `WARN` and `ERROR` log messages.
* `--no-interactive`: Turn off interactive prompts and fancy outputs. If a CI
  server is detected (we use [ci-info](https://www.npmjs.com/package/ci-info)),
  the CLI is automatically non-interactive.
* `--confirm`: Turn on auto-confirmation of confirmation prompts. *Careful*:
  the CLI prompts before doing something potentially harmful. Auto-confirming
  may have unintended results.

## CLI Config

The CLI provides commands for setting and printing config values from project
config files and the global CLI config file. See `ionic config set --help` and
`ionic config get --help` for usage.

## CLI Hooks

CLI hooks are how you can run scripts during CLI events, such as "watch" and
"build". To hook into the CLI, use the following [npm
scripts](https://docs.npmjs.com/misc/scripts) in your `package.json` file:

| npm script           | description                                                       | commands                                                                                                                  |
|----------------------|-------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------|
| `ionic:watch:before` | Runs **before** the file watcher activates during a "watch" event | `ionic serve`, `ionic cordova run -l`, `ionic cordova emulate -l`                                                         |
| `ionic:build:before` | Runs **before** the Ionic "build" event starts.                   | `ionic build`, `ionic upload`, `ionic package build`, `ionic cordova build`, `ionic cordova run`, `ionic cordova emulate` |
| `ionic:build:after`  | Runs **after** the Ionic "build" event finishes.                  | `ionic build`, `ionic upload`, `ionic package build`, `ionic cordova build`, `ionic cordova run`, `ionic cordova emulate` |

### Example

```json
  "scripts": {
    "ionic:build:before": "cp somefile www/somefile",
  }
```

:memo: *Note: If you use [gulp](https://gulpjs.com/), the CLI will run gulp
tasks by the same name as the npm scripts above.*

## Service Proxies

The CLI can add proxies to the HTTP server for "livereload" commands like
`ionic serve`, `ionic cordova run android -lcs`, or similar. These proxies are
useful if you are developing in the browser and you need to make calls to an
external API. With this feature you can proxy request to the external api
through the ionic http server preventing the `No 'Access-Control-Allow-Origin'
header is present on the requested resource` error.

In the `ionic.config.json` file you can add a property with an array of proxies
you want to add. The proxies are an object with the following properties:

* `path`: string that will be matched against the beginning of the incoming
  request URL.
* `proxyUrl`: a string with the url of where the proxied request should go.
* `proxyNoAgent`: (optional) true/false, if true opts out of connection
  pooling, see
  [HttpAgent](https://nodejs.org/api/http.html#http_class_http_agent)

```json
{
  "name": "appname",
  "app_id": "",
  "type": "ionic-angular",
  "proxies": [
    {
      "path": "/v1",
      "proxyUrl": "https://api.instagram.com/v1"
    }
  ]
}

```

Using the above configuration, you can now make requests to your local server
at `http://localhost:8100/v1` to have it proxy out requests to
`https://api.instagram.com/v1`.

:memo: *Note: Don't forget to change the URLs being requested in your app to
the local URL. Also, the "livereload" command must be restarted for the proxy
configuration to take effect.*

## Using a Proxy

To proxy HTTP requests performed by the CLI, you will need to install the CLI
proxy plugin in the same `node_modules` context as the Ionic CLI:

For CLI installed globally:

```bash
$ npm install -g @ionic/cli-plugin-proxy
```

For CLI installed locally:

```bash
$ cd myProject # cd into your project
$ npm install --save-exact --save-dev @ionic/cli-plugin-proxy
```

Then, set the following environment variables:

```bash
$ export HTTP_PROXY=http://proxy.example.org:8888 # used by npm
$ export HTTPS_PROXY=https://proxy.example.org:8888 # used by npm
$ export IONIC_HTTP_PROXY=http://proxy.example.org:8888
```

For example:

```bash
$ HTTPS_PROXY=https://internal.proxy.com ionic start
```

## Legacy Version

The old version of the CLI can be installed with the `legacy` tag:

```bash
npm install -g ionic@legacy
```

[ionic-homepage]: https://ionicframework.com
[ionic-docs]: https://ionicframework.com/docs
[ionic-support]: https://ionicframework.com/support

[ionic-angular-docs]: https://ionicframework.com/docs
[ionic-angular-blank]: https://github.com/ionic-team/ionic2-starter-blank
[ionic-angular-tabs]: https://github.com/ionic-team/ionic2-starter-tabs
[ionic-angular-sidemenu]: https://github.com/ionic-team/ionic2-starter-sidemenu
[ionic-angular-conference]: https://github.com/ionic-team/ionic-conference-app
[ionic-angular-tutorial]: https://github.com/ionic-team/ionic2-starter-tutorial
[ionic-angular-super]: https://github.com/ionic-team/ionic-starter-super

[ionic1-docs]: https://ionicframework.com/docs/v1
[ionic1-blank]: https://github.com/ionic-team/ionic-starter-blank
[ionic1-tabs]: https://github.com/ionic-team/ionic-starter-tabs
[ionic1-sidemenu]: https://github.com/ionic-team/ionic-starter-sidemenu
[ionic1-maps]: https://github.com/ionic-team/ionic-starter-maps

[circle-badge]: https://circleci.com/gh/ionic-team/ionic-cli.svg?style=shield
[circle-badge-url]: https://circleci.com/gh/ionic-team/ionic-cli
[npm-badge]: https://img.shields.io/npm/v/ionic.svg
[npm-badge-url]: https://www.npmjs.com/package/ionic
