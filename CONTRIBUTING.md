# Contributing

:mega: **Support/Questions?**: Please see our [Support
Page](http://ionicframework.com/support) for general support questions. The
issues on GitHub should be reserved for bug reports and feature requests.

### Bug Reports

Please copy/paste the output of the `ionic info` command into your issue and be
as descriptive as possible. Include any steps that might help us reproduce your
issue.

### Feature Requests

Post an issue describing your feature to open a dialogue with us. We're happy
to hear from you!

### Pull Requests

Pull requests are most welcome! But, if you plan to add features or do large
refactors, please **open a dialogue** with us first by creating an issue. Small
bug fixes are welcome any time.

#### Local Setup

##### Structure

Our CLI is organized into a single multi-package repository. Common tools, such
as Typescript and jest, are installed in the base directory while package
dependencies are each installed in their respective `packages/*/node_modules`
directories.

Each `packages/*` folder represents a package on npm. Packages with `cli-`
prefix are published under the `@ionic` namespace, while the `ionic` package is
published as `ionic`.

* `packages/ionic`: The globally installed CLI package.
* `packages/cli-utils`: The globally installed CLI utilities package.
* `packages/cli-plugin-*`: The locally installed CLI plugins.

##### Toolset

* Our codebase is written in [Typescript](https://www.typescriptlang.org/). If
  you're unfamiliar with Typescript, we recommend using [VS
  Code](https://code.visualstudio.com/) and finding a tutorial to familiarize
  yourself with basic concepts.
* Our test suite uses [Jest](https://facebook.github.io/jest/).

##### Setup

1. Fork the repo & clone it locally.
1. `npm install` to install the dev tools.
1. `npm run bootstrap` (will install package dependencies and link packages
   together)
1. For each package you plan to modify, `cd` into its `packages/*` directory
   and run `npm run watch`.
    * You should see `TS` and `JS` colored prefixes. We run the Typescript
      compiler as well as a JS file watcher for some string replacements.
    * You should **always** run `npm run watch` in the `packages/cli-utils` and
      `packages/ionic` directories.
1. Typescript source files are in `packages/*/src`.
1. Good luck! :muscle: Please open an issue if you have questions or something
   is unclear.

###### Running Dev CLI

:memo: *Note: The following assumes you are in a macOS/Linux environment. For
Windows, commands may differ.*

1. Within each `packages/cli-*` (not `packages/ionic`) directory, run `npm
   link` (you may need `sudo`). This will let the CLI install local versions of
   plugins.
1. Put `alias i=/path/to/ionic-cli/packages/ionic/bin/ionic` (making sure to
   change `/path/to` to your installation directory) in `~/.bashrc` (or
   equivalent) and `source ~/.bashrc`.
1. You should now be able to run `i help` and see your locally installed
   version.

##### Code Structure

TODO: Be helpful about where to look for commands, utilities, etc.

##### Publishing Notes

Cancel **ALL** watch scripts before proceeding.

* **canary releases**: `npm run publish:canary`
* **beta releases**: `npm run publish:beta`
* **stable releases**: `npm run publish`
