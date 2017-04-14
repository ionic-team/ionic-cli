[![Build Status][circle-badge]][circle-badge-url]
[![npm][npm-badge]][npm-badge-url]

# Ionic CLI

The Ionic Framework command line utility makes it easy to start, build, run,
and emulate [Ionic](http://ionicframework.com/) apps.

Use the `ionic help` command for more detailed task information.

**Support/Questions?**: Please see our [Support
Page](http://ionicframework.com/support) for general support questions. The
issues on GitHub should be reserved for bug reports and feature requests.

## Requirements

* Node 6+
* npm 3+

## Install

```bash
$ npm install -g ionic@beta
```

*Note: For a global install of `-g ionic`, OSX/Linux users may need to prefix
the command with `sudo` or can setup [proper file permissions on OSX for
npm](http://www.johnpapa.net/how-to-use-npm-global-without-sudo-on-osx/) to
install without `sudo`.*

## Changes from CLI 2

We have rewritten the CLI from the ground up.  Our main focus was to:

1. Decrease the amount of time to the first **start** execution
1. Improve the responsiveness of every CLI command
1. Make the architecture flexible for future platform support (PWA, electron, etc.)
1. Provide better **help**, more guidance, and more feedback when executing commands.

In doing so we decided to take a new approach to the CLI's structure. The base
CLI installation now ships with global commands that are common to all Ionic
apps.

Cordova commands have been namespaced and put into a CLI _plugin_, which is
installed by default with new Ionic projects and can be installed in existing
Ionic projects with `npm i --save @ionic/cli-plugin-cordova`. For full details,
see below.

Here is a brief summary of changes in CLI 3. For more details and reasoning,
see [CHANGELOG.md](https://github.com/driftyco/ionic-cli/blob/v3/CHANGELOG.md).

* Removed commands: `setup`, `share`, `lib`, `io`, `security`, `push`,
  `package`, `config`, `service`, `add`, `remove`, `list`, `hooks`, `state`.
* Added commands: `signup`.
* Cordova commands have been namespaced (e.g. `ionic cordova build`, not `ionic
  build`).
* Many command arguments, options, and flags have changed. Please use `ionic
  help <commands>` for command usage.
* `generate` command has been overhauled to interactively generate components,
  pages, etc.

#### Upgrading from a previous beta release to beta7

You will need to install the newly updated CLI globally and execute the
following command in your Ionic project directory.

```bash
$ npm install -g ionic@beta
$ npm uninstall --save-dev @ionic/cli-plugin-core @ionic/cli-build-ionic-angular
$ npm install --save-dev @ionic/cli-plugin-cordova @ionic/cli-plugin-ionic-angular
```

#### Latest beta release versions

 - ionic@3.0.0-beta7
 - @ionic/cli-plugin-cordova@0.0.12
 - @ionic/cli-plugin-ionic-angular@0.0.6
 - @ionic/cli-plugin-ionic1@0.0.6

## Ionic Framework - Using CLI 3

### Start a new project
```bash
$ npm install -g ionic@beta
$ ionic start myNewProject
```

### Existing project

```bash
$ npm install -g ionic@beta
$ npm install --save-dev @ionic/cli-plugin-ionic-angular@beta @ionic/cli-plugin-cordova@beta
$ ionic help
```

## Ionic 1 - Using CLI 3

### Start a new project

```bash
$ npm install -g ionic@beta
$ ionic start myNewProject blank --type ionic1
```

### Existing project

```bash
$ npm install -g ionic@beta
$ npm install --save-dev @ionic/cli-plugin-ionic1@beta @ionic/cli-plugin-cordova@beta
$ ionic help
```

## Feedback

We are currently actively seeking feedback from those that use CLI 3 Beta. If
you have questions or issues please feel free to open a new issue.

**Ionic 2 template starters:**

* [blank](https://github.com/driftyco/ionic2-starter-blank)
* [tabs](https://github.com/driftyco/ionic2-starter-tabs)
* [sidemenu](https://github.com/driftyco/ionic2-starter-sidemenu)
* [conference](https://github.com/driftyco/ionic-conference-app)
* [tutorial](https://github.com/driftyco/ionis2-starter-tutorial)

## Service Proxies

The `serve` command can add some proxies to the http server. These proxies are
useful if you are developing in the browser and you need to make calls to an
external API. With this feature you can proxy request to the external api
through the ionic http server preventing the `No 'Access-Control-Allow-Origin'
header is present on the requested resource` error.

In the `ionic.config.json` file you can add a property with an array of proxies
you want to add. The proxies are object with the following properties:

* `path`: string that will be matched against the beginning of the incoming
  request URL.
* `proxyUrl`: a string with the url of where the proxied request should go.
* `proxyNoAgent`: (optional) true/false, if true opts out of connection
  pooling, see
  [HttpAgent](http://nodejs.org/api/http.html#http_class_http_agent)

```json
{
  "name": "appname",
  "email": "",
  "app_id": "",
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
`https://api.instagram.com/v1`

## Cordova Commands

Ionic uses Cordova underneath, so you can also substitute Cordova commands to
`prepare`/`build`/`emulate`/`run`, or to add additional plugins.

*Note: We occasionally send anonymous usage statistics to the Ionic team to
make the tool better.*

## Using a Proxy

To proxy CLI requests, you will first need to install a CLI plugin:

```bash
$ npm install --save-dev @ionic/cli-plugin-proxy
```

Then, set any of the following environment variables:

```bash
$ export http_proxy=http://internal.proxy.com
$ export HTTP_PROXY=http://internal.proxy.com
$ export PROXY=http://internal.proxy.com
$ export IONIC_HTTP_PROXY=http://internal.proxy.com
```

For example:

```bash
$ HTTP_PROXY=http://internal.proxy.com ionic login
```

## Ionic Docs

To open Ionic documentation from the Ionic CLI, use `ionic docs`.

[circle-badge]: https://circleci.com/gh/driftyco/ionic-cli.svg?style=shield
[circle-badge-url]: https://circleci.com/gh/driftyco/ionic-cli
[npm-badge]: https://img.shields.io/npm/v/ionic.svg
[npm-badge-url]: https://www.npmjs.com/package/ionic
