# Contributing

:mega: **Support/Questions?**: Please see our [Support
Page](https://ionicframework.com/support) for general support questions. The
issues on GitHub should be reserved for bug reports and feature requests.

### Branches

* [`develop`](https://github.com/ionic-team/ionic-cli/tree/develop): **development** branch
* [`master`](https://github.com/ionic-team/ionic-cli/tree/master): **stable** version (`npm install -g ionic`)
* [`3.x`](https://github.com/ionic-team/ionic-cli/tree/3.x): **previous** version (`npm install -g ionic@3`)
* [`2.x`](https://github.com/ionic-team/ionic-cli/tree/2.x): **legacy** version (`npm install -g ionic@legacy`)

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

* [`packages/ionic`](https://github.com/ionic-team/ionic-cli/tree/develop/packages/ionic): Ionic CLI executable.
* [`packages/@ionic/cli-utils`](https://github.com/ionic-team/ionic-cli/tree/develop/packages/%40ionic/cli-utils): Ionic CLI library and utilities.
* [`packages/@ionic/cli-framework`](https://github.com/ionic-team/ionic-cli/tree/develop/packages/%40ionic/cli-framework): Framework for command-line programs.
* [`packages/@ionic/discover`](https://github.com/ionic-team/ionic-cli/tree/develop/packages/%40ionic/discover): Service discovery library used for `ionic serve` with the [Ionic DevApp](https://ionicframework.com/docs/pro/devapp/).
* [`packages/@ionic/lab`](https://github.com/ionic-team/ionic-cli/tree/develop/packages/%40ionic/lab): Utility CLI for Ionic Lab, used by `ionic serve`.

##### Ionic/Angular 4+

* [`packages/@ionic/ng-toolkit`](https://github.com/ionic-team/ionic-cli/tree/develop/packages/%40ionic/ng-toolkit): Builders for Ionic/Angular 4+.
* [`packages/@ionic/schematics-angular`](https://github.com/ionic-team/ionic-cli/tree/develop/packages/%40ionic/schematics-angular): Schematics for `ng generate`.

##### Ionic 1

* [`packages/@ionic/v1-toolkit`](https://github.com/ionic-team/ionic-cli/tree/develop/packages/%40ionic/v1-toolkit): Utility CLI for Ionic v1 Apps, used by `ionic serve`.

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

To switch between dev CLI and stable CLI, you can use a Node version manager
such as [nvm](https://github.com/creationix/nvm) and switch between
environments, e.g.

```bash
nvm install v8.11.3
nvm alias cli-local v8.11.3
```

You can even set up an alias in your terminal that sets `IONIC_CONFIG_DIRECTORY`
to have seperate configuration environments.

```bash
alias cli-local="nvm use cli-local && export IONIC_CONFIG_DIRECTORY=$HOME/.ionic/cli-local"
```

When the Node environment is created, create a symlink to `packages/ionic/bin/ionic` within `$NVM_BIN`:

```bash
ln -s $(pwd)/packages/ionic/bin/ionic $NVM_BIN
```

##### Debugging

The following workflow is recommended for debugging the Ionic CLI:

1. Place
   [`debugger;`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/debugger)
   statements where desired.
1. Run the CLI via `node` to use Node's `--inspect-brk` flag:

    * Instead of `~/path/to/ionic <command>` use `node --inspect-brk
      ~/path/to/ionic <command>`.
    * Instead of `ionic <command>`, try `node --inspect-brk $(which ionic)
      <command>` (works on Mac and Linux).

1. Open `chrome://inspect` in Chrome and select the remote target to use
   DevTools for debugging.

Read more about Node debugging in the [Debugging
Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/).

##### Code Structure

TODO: Be helpful about where to look for commands, utilities, etc.

##### Publishing

CI automatically publishes the next version semantically from analyzing commits in `master`. To maintain a shared history between `develop` and `master`, the branches must be rebased with each other locally.

* When it's time to cut a release from `develop`:

    ```
    git checkout master
    git rebase develop
    git push origin master
    ```

* Await successful publish in CI. Ionitron will push the updated versions and tags to `master`.
* Sync `develop` with `master`.

  ```
  git pull origin master
  git checkout develop
  git rebase master
  git push origin develop
  ```

To publish **testing** versions, follow these steps:

1. Cancel any watch scripts.
1. Run `npm run publish:testing`
