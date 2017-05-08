---
layout: fluid/docs_base
category: cli
id: cli-intro
title: Ionic CLI Documentation
---

# ionic


The Ionic CLI is your go-to tool for developing Ionic apps. You can follow CLI
development on [Github](https://github.com/driftyco/ionic-cli).

## Installation

Please make sure
[Node](https://ionicframework.com/docs/resources/what-is/#node) 6+ and
[NPM](https://ionicframework.com/docs/resources/what-is/#npm) 3+ are
installed.

Then, install the CLI globally (you may need sudo):

```bash
$ npm install -g ionic@latest
```

## Getting Started

Start a new Ionic project using `ionic start`:

```bash
ionic start myNewProject tabs
cd ./myNewProject
```

This will create a new app named `myNewProject`. Once you `cd` into your
project's directory, a few new commands become available to you, such as
`serve`:

```bash
ionic serve
```

## Commands

Here is a full list of Ionic commands. You can also see the list on the command
line with `ionic --help`.

Command | Description
------- | -----------
[docs](docs/index.md) | Open the Ionic documentation website
[generate](generate/index.md) | Generate pipes, components, pages, directives, providers, and tabs (ionic-angular >= 3.0.0)
[info](info/index.md) | Print system/environment info
[link](link/index.md) | Connect your local app to Ionic
[login](login/index.md) | Login with your Ionic ID
[serve](serve/index.md) | Start a local development server for app dev/testing
[signup](signup/index.md) | Create an Ionic account
[start](start/index.md) | Create a new project
[telemetry](telemetry/index.md) | Opt in and out of telemetry
[upload](upload/index.md) | Upload a new snapshot of your app
[cordova build](cordova/build/index.md) | Build (prepare + compile) an Ionic project for a given platform
[cordova compile](cordova/compile/index.md) | Compile native platform code
[cordova emulate](cordova/emulate/index.md) | Emulate an Ionic project on a simulator or emulator
[cordova platform](cordova/platform/index.md) | Add or remove a platform target for building an Ionic app
[cordova plugin](cordova/plugin/index.md) | Manage Cordova plugins
[cordova prepare](cordova/prepare/index.md) | Transform metadata to platform manifests and copies assets to Cordova platforms
[cordova resources](cordova/resources/index.md) | Automatically create icon and splash screen resources
[cordova run](cordova/run/index.md) | Run an Ionic project on a connected device
[package build](package/build/index.md) | Start a package build
[package download](package/download/index.md) | Download your packaged app
[package info](package/info/index.md) | Get info about a build
[package list](package/list/index.md) | List your cloud builds
