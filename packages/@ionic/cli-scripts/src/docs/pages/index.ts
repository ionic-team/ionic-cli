import { IonicEnvironment } from '@ionic/cli-utils';

import { getWarning } from '../utils';

export default async function(env: IonicEnvironment) {
  return `---
layout: fluid/cli_docs_base
category: cli
id: cli-index
title: Ionic CLI Documentation
hide_header_search: true
dark_header: true
---

${getWarning()}

# Ionic CLI

The Ionic Command Line Interface (CLI) is your go-to tool for developing Ionic apps. You can follow CLI development on [Github](https://github.com/ionic-team/ionic-cli).

{% include fluid/toc.html %}

## Installation

Please make sure latest [Node](/docs/resources/what-is/#node) 6 LTS and [NPM](/docs/resources/what-is/#npm) 3+ are installed.

Then, install the CLI globally (you may need sudo):

\`\`\`bash
$ npm install -g ionic@latest
\`\`\`

You can verify your installation with the \`ionic --version\` command.

## Getting Started

Start a new Ionic project using \`ionic start\`:

\`\`\`bash
$ ionic start myNewProject
\`\`\`

\`ionic start\` will prompt you to select a "starter". We recommend using the \`tutorial\` starter for your first app. See [Starter Templates](/docs/cli/starters.html) for a full list.

After selecting a starter, the CLI will create a new app named \`myNewProject\`. Once you \`cd\` into your project's directory, a few new commands become available to you, such as \`ionic serve\`:

\`\`\`bash
$ cd ./myNewProject
$ ionic serve
\`\`\`

While running \`ionic serve\`, changes you make to your app code will automatically refresh the browser. If you want to see your app on a device or emulator, you can [use Cordova](#using-cordova).

You can list available commands with the \`ionic --help\` command.

## Using Cordova

Integrate Ionic with [Cordova](https://cordova.apache.org/) to bring native capabilities to your app.

\`\`\`bash
$ npm install -g cordova
$ ionic cordova --help
$ ionic cordova run ios
\`\`\`

The \`ionic cordova\` commands (aside from \`ionic cordova resources\`) wrap the Cordova CLI. You can read about the differences in each command's \`--help\` page. To learn more about the commands, see the [Cordova CLI Reference](https://cordova.apache.org/docs/en/latest/reference/cordova-cli/) documentation.

* For iOS development, see the [iOS Platform Guide](https://cordova.apache.org/docs/en/latest/guide/platforms/ios/index.html).
* For Android development, see the [Android Platform Guide](https://cordova.apache.org/docs/en/latest/guide/platforms/android/index.html).

## Ionic Pro

[Ionic Pro](/pro/) is a powerful suite of tools and services designed for the entire app lifecycle, all in one integrated experience. Ionic Pro is fully supported in the Ionic CLI. See the [Pro Docs](/docs/pro/basics/getting-started/) to get started.

## Troubleshooting

If you're having trouble with the Ionic CLI, you can try the following:

* Make sure you're on the latest version of the CLI. Update with \`npm update -g ionic\`.
* Try running commands with the \`--verbose\` flag, which will print \`DEBUG\` messages.
`;
}
