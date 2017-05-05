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
* `packages/cli-utils`: The locally installed CLI utilities package.
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
1. `npm run bootstrap`
1. For each package you plan to modify, `cd` into its `packages/*` directory
   and run `npm run watch`.
    * You should see `TS` and `JS` colored prefixes. We run the Typescript
      compiler as well as a JS file watcher for some string replacements.
    * You should **always** run `npm run watch` in the `packages/cli-utils` and
      `packages/ionic` directories.
1. Typescript source files are in `packages/*/src`.
1. Good luck! :muscle: Please open an issue if you have questions or something
   is unclear.

##### Code Structure

TODO: Be helpful about where to look for commands, utilities, etc.
