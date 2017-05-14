# Contributing

:mega: **Support/Questions?**: Please see our [Support
Page](http://ionicframework.com/support) for general support questions. The
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

#### Local Setup

:memo: *Note: The setup instructions may not work for Windows yet--please see
[#2225](https://github.com/driftyco/ionic-cli/issues/2225).*

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

* We recommend Node 7.6+.
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
1. `npm run watch` will spin up TS & JS watch scripts for all packages.
1. Typescript source files are in `packages/*/src`.
1. Good luck! :muscle: Please open an issue if you have questions or something
   is unclear.

##### Running Dev CLI

###### macOS/Linux
1. Put `alias ionic-local=/path/to/ionic-cli/packages/ionic/bin/ionic` (making
   sure to change `/path/to` to your installation directory) in `~/.bashrc` (or
   equivalent) and `source ~/.bashrc`.
1. You should now be able to run `ionic-local help` and see your locally
   installed version.
   
###### Windows
1. Create a `ionic-local.cmd` file at `%AppData%\npm\` with the following content:
```
@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "C:\path\to\ionic-cli\packages\ionic\bin\ionic" %*
) ELSE (
  @SETLOCAL
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node  "C:\path\to\ionic-cli\packages\ionic\bin\ionic" %*
)
```
1. You should now be able to run `ionic-local help` and see your locally
   installed version without change the existing ionic installation.

**OR**

1. Run `npm i -g in-publish` to solve npm prepublish issue.
1. Run `npm link` from `packages/ionic`.
1. You should now be able to run `ionic help` and see your locally
   installed version in place of default ionic installation.

##### Code Structure

TODO: Be helpful about where to look for commands, utilities, etc.

##### Publishing Notes

Cancel any watch scripts before proceeding.

* **canary releases**: `npm run publish:canary`
* **beta releases**: `npm run publish:beta`
* **stable releases**: `npm run publish`
