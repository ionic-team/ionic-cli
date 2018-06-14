# Contributing

:mega: **Support/Questions?**: Please see our [Support
Page](https://ionicframework.com/support) for general support questions. The
issues on GitHub should be reserved for bug reports and feature requests.

### Bug Reports

Run the command(s) with `--verbose` to produce debugging output. We may ask for
the full command output, including debug statements.

Please also copy/paste the output of the `ionic info` command into your issue
and be as descriptive as possible. Include any steps that might help us
reproduce your issue.

### Feature Requests

Post an issue describing your feature to open a dialogue with us. We're happy
to hear from you!

### Pull Requests

Pull requests are most welcome! But, if you plan to add features or do large
refactors, please **open a dialogue** with us first by creating an issue. Small
bug fixes are welcome any time.

#### Help Wanted

Looking for small issues to help with? You can browse the [`help
wanted`](https://github.com/ionic-team/ionic-cli/labels/help%20wanted) label.
These are issues that have been marked as great opportunities for someone's
first PR to the Ionic CLI. :heart_eyes:

### Local Setup

#### Structure

The Ionic CLI is organized into a monorepo. Here are the packages:

##### General Purpose

* [`packages/ionic`](https://github.com/ionic-team/ionic-cli/tree/master/packages/ionic):
  Ionic CLI executable.
* [`packages/@ionic/cli-utils`](https://github.com/ionic-team/ionic-cli/tree/master/packages/%40ionic/cli-utils):
  Ionic CLI library and utilities.
* [`packages/@ionic/cli-framework`](https://github.com/ionic-team/ionic-cli/tree/master/packages/%40ionic/cli-framework):
  Framework for command-line programs.
* [`packages/@ionic/discover`](https://github.com/ionic-team/ionic-cli/tree/master/packages/%40ionic/discover):
  Service discovery library used for `ionic serve` with the [Ionic
  DevApp](https://ionicframework.com/docs/pro/devapp/).
* [`packages/@ionic/lab`](https://github.com/ionic-team/ionic-cli/tree/master/packages/%40ionic/lab):
  Utility CLI for Ionic Lab, used by `ionic serve`.

##### Ionic/Angular 4+

* [`packages/@ionic/ng-toolkit`](https://github.com/ionic-team/ionic-cli/tree/master/packages/%40ionic/ng-toolkit):
  Builders for Ionic/Angular 4+.
* [`packages/@ionic/schematics-angular`](https://github.com/ionic-team/ionic-cli/tree/master/packages/%40ionic/schematics-angular):
  Schematics for `ng generate`.

##### Ionic 1

* [`packages/@ionic/v1-toolkit`](https://github.com/ionic-team/ionic-cli/tree/master/packages/%40ionic/v1-toolkit):
  Utility CLI for Ionic v1 Apps, used by `ionic serve`.

#### Toolset

* npm 5 is required.
* Node 8+ is required.
* The codebase is written in [TypeScript](https://www.typescriptlang.org/). If
  you're unfamiliar with TypeScript, we recommend using [VS
  Code](https://code.visualstudio.com/) and finding a tutorial to familiarize
  yourself with basic concepts.
* The test suite uses [Jest](https://facebook.github.io/jest/).

#### Setup

1. Fork the repo & clone it locally.
1. `npm install` to install the dev tools.
1. `npm run bootstrap` (will install package dependencies and link packages
   together)
1. Optionally `npm run link` to make `ionic` and other bin files point to your
   dev CLI.
1. `npm run watch` will spin up TypeScript watch scripts for all packages.
1. TypeScript source files are in `packages/**/src`.
1. Good luck! :muscle: Please open an issue if you have questions or something
   is unclear.

#### Running Dev CLI

Switch to dev CLI:

```bash
$ npm uninstall -g ionic
$ npm run link
```

Switch back to stable CLI:

```bash
$ npm run unlink
$ npm install -g ionic
```

##### Code Structure

TODO: Be helpful about where to look for commands, utilities, etc.

##### Publishing Steps

1. Cancel any watch scripts.
1. Write notable changes in the package(s)'s `CHANGELOG.md` file(s).
1. For...

    * ...testing releases: `npm run publish:testing`
    * ...canary releases: `npm run publish:canary`
    * ...stable releases: `npm run publish`
