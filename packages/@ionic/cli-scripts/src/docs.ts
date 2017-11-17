import * as path from 'path';

import stripAnsi = require('strip-ansi');
import * as ansiStyle from 'ansi-styles';
import * as escapeStringRegexp from 'escape-string-regexp';

import { generateRootPlugin } from 'ionic';
import { copyDirectory, fsMkdirp, fsStat, fsWriteFile } from '@ionic/cli-framework/utils/fs';

import {
  CommandData,
  CommandInput,
  CommandOption,
  IonicEnvironment,
  StarterTemplate,
  generateIonicEnvironment,
} from '@ionic/cli-utils';

import { STARTER_TEMPLATES } from '@ionic/cli-utils/lib/start';

export async function run() {
  const plugin = await generateRootPlugin();
  const env = await generateIonicEnvironment(plugin, process.argv.slice(2), process.env);

  const indexPath = path.resolve(__dirname, '..', '..', '..', '..', 'docs', 'index.md');
  const indexDoc = await formatIonicPage(env);

  const commandsPath = path.resolve(__dirname, '..', '..', '..', '..', 'docs', 'commands.md');
  const commandsDoc = await formatCommandsPage(env);

  const configuringPath = path.resolve(__dirname, '..', '..', '..', '..', 'docs', 'configuring.md');
  const configuringDoc = await formatConfiguringPage();

  const startersPath = path.resolve(__dirname, '..', '..', '..', '..', 'docs', 'starters.md');
  const startersDoc = await formatStartersPage();

  await fsMkdirp(path.dirname(indexPath));

  await fsWriteFile(indexPath, indexDoc, { encoding: 'utf8' });
  await fsWriteFile(commandsPath, commandsDoc, { encoding: 'utf8' });
  await fsWriteFile(configuringPath, configuringDoc, { encoding: 'utf8' });
  await fsWriteFile(startersPath, startersDoc, { encoding: 'utf8' });

  const commands = await getCommandList(env);
  const commandPromises = commands.map(async (cmd) => {
    const cmdPath = path.resolve(__dirname, '..', '..', '..', '..', 'docs', ...cmd.fullName.split(' '), 'index.md');
    const cmdDoc = formatCommandDoc(env, cmd);

    await fsMkdirp(path.dirname(cmdPath));
    await fsWriteFile(cmdPath, cmdDoc, { encoding: 'utf8' });
  });

  await Promise.all(commandPromises);
  await copyToIonicSite();

  await env.close();
}

async function getCommandList(env: IonicEnvironment) {
  const cmds = await env.namespace.getCommandMetadataList();
  return cmds.filter(cmd => cmd.visible !== false);
}

async function formatIonicPage(env: IonicEnvironment) {
  return `---
layout: fluid/cli_docs_base
category: cli
id: cli-index
title: Ionic CLI Documentation
hide_header_search: true
dark_header: true
---

${sillyNotice()}

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

[Ionic Pro](/products/) is a powerful suite of tools and services designed for the entire app lifecycle, all in one integrated experience. Ionic Pro is fully supported in the Ionic CLI. See the [Pro Docs](/docs/pro/basics/getting-started/) to get started.

Ionic Cloud (legacy) will be supported until its end-of-life on January 31st, 2018. Until then, you can switch between Ionic Cloud and Ionic Pro with \`ionic config set -g backend legacy\` and \`ionic config set -g backend pro\`. Unfortunately, you'll need to re-authenticate with \`ionic login\` each time the backend mode is switched.

## Troubleshooting

If you're having trouble with the Ionic CLI, you can try the following:

* Make sure you're on the latest version of the CLI. Update with \`npm update -g ionic\`.
* Try running commands with the \`--verbose\` flag, which will print \`DEBUG\` messages.
`;
}

async function formatCommandsPage(env: IonicEnvironment) {
  const commands = await getCommandList(env);

  function listCommandLink(cmdData: CommandData) {
    if (!cmdData.fullName) {
      cmdData.fullName = cmdData.name;
    }

    return `[${cmdData.fullName}](${path.join(...cmdData.fullName.split(' '))}/) | ${cmdData.deprecated ? '(deprecated) ' : ''}${stripAnsi(cmdData.description)}`;
  }

  return `${formatPageHeader('Commands', 'cli-command-list')}

This is a comprehensive list of CLI commands. The \`ionic --help\` command will show a more organized and accurate list of commands.

Command | Description
------- | -----------
${commands.map(listCommandLink).join(`
`)}
`;
}

function formatConfiguringPage() {
  return `${formatPageHeader('Configuring', 'cli-configuration')}

{% include fluid/toc.html %}

## Config Files

Configuration values are stored in JSON files.

* Global config file (\`~/.ionic/config.json\`): for global CLI config and auth
* Project config files (\`ionic.config.json\`): for Ionic project config

The CLI provides commands for setting and printing config values from project config files and the global CLI config file. See \`ionic config set --help\` and \`ionic config get --help\` for usage.

## Integrations

Integrations such as Cordova are automatically activated when detected, but can be easily disabled.

Integrations hook into CLI events. For example, when the Cordova integration is enabled, \`ionic cordova prepare\` will run after \`ionic build\` runs. See [Hooks](#hooks).

| integration | enabled when...                                             | disabled with...                                         |
| ------------|-------------------------------------------------------------|----------------------------------------------------------|
| Cordova     | \`ionic cordova\` commands are run                          | \`ionic config set integrations.cordova.enabled false\`  |
| Gulp        | \`gulp\` exists in \`devDependencies\` of your \`package.json\` | \`ionic config set integrations.gulp.enabled false\` |

## Environment Variables

The CLI will look for the following environment variables:

* \`IONIC_CONFIG_DIRECTORY\`: The directory of the global CLI config. Defaults to \`~/.ionic\`.
* \`IONIC_HTTP_PROXY\`: Set a URL for proxying all CLI requests through. See [Using a Proxy](#using-a-proxy). The CLI will also look for \`HTTP_PROXY\` and \`HTTPS_PROXY\`, both of which npm use.
* \`IONIC_EMAIL\` / \`IONIC_PASSWORD\`: For automatic login via environment variables.

### Command Options

You can express command options (normally set with \`--opt=value\` syntax) with environment variables. The naming of these environment variables follows a pattern: start with \`IONIC_CMDOPTS_\`, add the command name (replacing any spaces with underscores), add the option name (replacing any hyphens with underscores), and then uppercase everything. Boolean flags (command-line options that don't take a value) can be set to \`1\` or \`0\`. Strip the \`--no-\` prefix in boolean flags, if it exists (\`--no-open\` in \`ionic serve\` can be expressed with \`IONIC_CMDOPTS_SERVE_OPEN=0\`, for example).

For example, the command options in \`ionic cordova run ios -lc --livereload-port=1234 --address=localhost\` can also be expressed with this series of environment variables:

\`\`\`bash
export IONIC_CMDOPTS_CORDOVA_RUN_LIVERELOAD=1
export IONIC_CMDOPTS_CORDOVA_RUN_CONSOLELOGS=1
export IONIC_CMDOPTS_CORDOVA_RUN_LIVERELOAD_PORT=1234
export IONIC_CMDOPTS_CORDOVA_RUN_ADDRESS=localhost
\`\`\`

If these variables are set in your environment, \`ionic cordova build ios\` will use new defaults for its options.

## Flags

CLI flags are global options that alter the behavior of a CLI command.

* \`--help\`: Instead of running the command, view its help page.
* \`--verbose\`: Show all log messages for debugging purposes.
* \`--quiet\`: Only show \`WARN\` and \`ERROR\` log messages.
* \`--no-interactive\`: Turn off interactive prompts and fancy outputs. If a CI server is detected (we use [ci-info](https://www.npmjs.com/package/ci-info)), the CLI is automatically non-interactive.
* \`--confirm\`: Turn on auto-confirmation of confirmation prompts. *Careful*: the CLI prompts before doing something potentially harmful. Auto-confirming may have unintended results.

## Hooks

CLI hooks are how you can run scripts during CLI events, such as "watch" and "build". To hook into the CLI, use the following [npm scripts](https://docs.npmjs.com/misc/scripts) in your \`package.json\` file:

| npm script             | commands                                                                                                                              |
|------------------------|---------------------------------------------------------------------------------------------------------------------------------------|
| \`ionic:watch:before\` | \`ionic serve\`, \`ionic cordova run -l\`, \`ionic cordova emulate -l\`                                                               |
| \`ionic:build:before\` | \`ionic build\`, \`ionic upload\`, \`ionic package build\`, \`ionic cordova build\`, \`ionic cordova run\`, \`ionic cordova emulate\` |
| \`ionic:build:after\`  | \`ionic build\`, \`ionic upload\`, \`ionic package build\`, \`ionic cordova build\`, \`ionic cordova run\`, \`ionic cordova emulate\` |

### Example

\`\`\`json
  "scripts": {
    "ionic:build:before": "cp somefile www/somefile",
  }
\`\`\`

*Note: If you use [gulp](https://gulpjs.com/), the CLI will run gulp tasks by the same name as the npm scripts above.*

## Service Proxies

The CLI can add proxies to the HTTP server for "livereload" commands like \`ionic serve\` and \`ionic cordova run android -lc\`. These proxies are useful if you are developing in the browser and you need to make calls to an external API. With this feature you can proxy requests to the external API through the Ionic CLI, which prevents the \`No 'Access-Control-Allow-Origin' header is present on the requested resource\` error.

In the \`ionic.config.json\` file you can add a property with an array of proxies you want to add. The proxies are an object with the following properties:

* \`path\`: string that will be matched against the beginning of the incoming request URL.
* \`proxyUrl\`: a string with the url of where the proxied request should go.
* \`proxyNoAgent\`: (optional) true/false, if true opts out of connection pooling, see [HttpAgent](https://nodejs.org/api/http.html#http_class_http_agent)

\`\`\`json
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
\`\`\`

Using the above configuration, you can now make requests to your local server at \`http://localhost:8100/v1\` to have it proxy out requests to \`https://api.instagram.com/v1\`.

*Note: Don't forget to change the URLs being requested in your app to the local URL. Also, the "livereload" command must be restarted for the proxy configuration to take effect.*

## Using a Proxy

To proxy HTTP requests performed by the CLI, you will need to install the CLI proxy plugin in the same \`node_modules\` context as the Ionic CLI:

For CLI installed globally:

\`\`\`bash
$ npm install -g @ionic/cli-plugin-proxy
\`\`\`

For CLI installed locally:

\`\`\`bash
$ cd myProject # cd into your project's directory
$ npm install --save-exact --save-dev @ionic/cli-plugin-proxy
\`\`\`

Then, use one of the following environment variables:

\`\`\`bash
$ export HTTP_PROXY="http://proxy.example.com:8888" # also used by npm
$ export HTTPS_PROXY="https://proxy.example.com:8888" # also used by npm
$ export IONIC_HTTP_PROXY="http://proxy.example.com:8888"
\`\`\`

### Other CLIs

Each CLI that you use must be configured separately to proxy network requests.

#### npm

\`\`\`bash
$ npm config set proxy http://proxy.company.com:8888
$ npm config set https-proxy https://proxy.company.com:8888
\`\`\`

#### git

\`\`\`bash
$ git config --global http.proxy http://proxy.example.com:8888
\`\`\`

### SSL Configuration

You can configure the Ionic CLI's SSL (similar to configuring npm CLI):

\`\`\`bash
$ ionic config set -g ssl.cafile /path/to/cafile # file path to your CA root certificate
$ ionic config set -g ssl.certfile /path/to/certfile # file path to a client certificate
$ ionic config set -g ssl.keyfile /path/to/keyfile # file path to a client key file
\`\`\`

The \`cafile\`, \`certfile\`, and \`keyfile\` entries can be manually edited as arrays of strings in \`~/.ionic/config.json\` to include multiple files.

## Telemetry

By default, the Ionic CLI sends usage data to Ionic, which we use to better your experience. To disable this functionality, you can run \`ionic config set -g telemetry false\`.
`;
}

interface Starter {
  type: string;
  name: string;
  starters: StarterTemplate[];
}

function formatStartersPage() {
  const formatStarter = (t: StarterTemplate) => {
    return `${t.name} | ${t.description}\n`;
  };

  const formatStartersTable = (starterType: Starter) => {
    return `
### ${starterType.name}

Starter | Description
--------|------------
${starterType.starters.map(formatStarter).join('')}
`;
  };

  const starters: Starter[] = [
    {
      type: 'ionic-angular',
      name: 'Ionic Angular',
      starters: STARTER_TEMPLATES.filter(s => s.type === 'ionic-angular'),
    },
    {
      type: 'ionic1',
      name: 'Ionic 1',
      starters: STARTER_TEMPLATES.filter(s => s.type === 'ionic1'),
    },
  ];

  return `${formatPageHeader('Starter Templates', 'cli-starter-list')}

{% include fluid/toc.html %}

This is comprehensive list of Ionic starter templates, which are ready-to-go starter packs for your next Ionic app. See the [\`ionic start\`](/docs/cli/start/) docs for usage.

## Starter Types

${starters.map(formatStartersTable).join('')}

## How it Works

The Ionic CLI will combine each starter template with its [base template](#base-templates) to provide a new project the files it needs to start development. See the [\`ionic start\`](/docs/cli/start/) docs for more information.
`;
}

function formatPageHeader(name: string, id: string) {
  return `---
layout: fluid/cli_docs_base
category: cli
id: ${id}
page_name: ${name}
title: ${name} - Ionic CLI Documentation
hide_header_search: true
dark_header: true
---

${sillyNotice()}

# ${name}
`;
}

function formatCommandHeader(cmd: CommandData) {
  if (!cmd.fullName) {
    cmd.fullName = cmd.name;
  }

  return `---
layout: fluid/cli_docs_base
category: cli
id: cli-${cmd.fullName.split(' ').join('-')}
page_name: ionic ${cmd.fullName}
command_name: ionic ${cmd.fullName}
title: ionic ${cmd.fullName} - Ionic CLI Documentation
header_sub_title: Ionic CLI
---

${sillyNotice()}

# \`$ ionic ${cmd.fullName}\`

`;
}

function sillyNotice() {
  return `
{% comment %}
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
DO NOT MODIFY THIS FILE DIRECTLY -- IT IS GENERATED FROM THE CLI REPO
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
{% endcomment %}
`;
}

function links2md(str: string) {
  return str.replace(/((http|https):\/\/(\w+:{0,1}\w*@)?([^\s\*\)`]+)(\/|\/([\w#!:.?+=&%@!\-\/]))?)/g, '[$1]($1)');
}

function ansi2md(str: string) {
  str = str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  str = convertAnsiToMd(str, ansiStyle.green, { open: '`', close: '`' });
  str = convertAnsiToMd(str, ansiStyle.yellow, { open: '', close: '' });
  str = convertAnsiToMd(str, ansiStyle.bold, { open: '**', close: '**' });
  return str;
}

function convertAnsiToMd(str: string, style: ansiStyle.EscapeCodePair, md: ansiStyle.EscapeCodePair) {
  str = str.replace(new RegExp(escapeStringRegexp(style.open) + '(.*?)' + escapeStringRegexp(style.close), 'g'), md.open + '$1' + md.close);
  return str;
}

function formatCommandDoc(env: IonicEnvironment, cmdMetadata: CommandData) {
  const description = stripAnsi(cmdMetadata.description).split('\n').join('\n  ');

  if (!cmdMetadata.fullName) {
    cmdMetadata.fullName = cmdMetadata.name;
  }

  return formatCommandHeader(cmdMetadata) +
    formatName(cmdMetadata.fullName, description) +
    formatSynopsis(cmdMetadata.inputs || [], cmdMetadata.fullName) +
    formatDescription(env, cmdMetadata) +
    formatExamples(cmdMetadata.exampleCommands || [], cmdMetadata.fullName);
}

function formatName(fullName: string, description: string) {
  return description;
}

function formatSynopsis(inputs: CommandInput[], commandName: string) {
  const headerLine = `## Synopsis`;
  const usageLine =
      `${commandName} ${
        (inputs || [])
          .map(input => {
            return '[<' + input.name + '>]';
          })
          .join(' ')}`;

  return `
${headerLine}

\`\`\`bash
$ ionic ${usageLine}
\`\`\`
  `;
}


function formatDescription(env: IonicEnvironment, cmdMetadata: CommandData) {
  let longDescription = cmdMetadata.longDescription;

  if (longDescription) {
    longDescription = stripAnsi(links2md(ansi2md(longDescription.trim())));
  }

  let inputs = cmdMetadata.inputs || [];
  let options = cmdMetadata.options || [];

  options = options.filter(o => o.visible !== false);

  const headerLine = `## Details`;

  function inputLineFn(input: CommandInput, index: number) {
    const name = input.name;
    const description = stripAnsi(ansi2md(input.description));
    const optionList = `\`${name}\``;

    return `${optionList} | ${description}`;
  }

  function optionLineFn(option: CommandOption) {
    const showInverse = option.type === Boolean && option.default === true && option.name.length > 1;
    const name = showInverse ? `--no-${option.name}` : `-${option.name.length > 1 ? '-' : ''}${option.name}`;
    const aliases = option.aliases;
    const description = stripAnsi(ansi2md(option.description));

    const optionList = `\`${name}\`` +
      (aliases && aliases.length > 0 ? ', ' +
       aliases
         .map((alias) => `\`-${alias}\``)
         .join(', ') : '');

    return `${optionList} | ${description}`;
  }

  return `
${headerLine}
${longDescription ? '\n' + longDescription + '\n' : ''}
${inputs.length > 0 ? `
Input | Description
----- | ----------` : ``}
${inputs.map(inputLineFn).join(`
`)}

${options.length > 0 ? `
Option | Description
------ | ----------` : ``}
${options.map(optionLineFn).join(`
`)}
`;
}

function formatExamples(exampleCommands: string[], commandName: string) {
  if (exampleCommands.length === 0) {
    return '';
  }

  const headerLine = `## Examples`;
  const exampleLines = exampleCommands.map(cmd => `$ ionic ${commandName} ${cmd}`);

  return `
${headerLine}

\`\`\`bash
${exampleLines.join('\n')}
\`\`\`
`;
}

async function copyToIonicSite() {
  const ionicSitePath = path.resolve(__dirname, '..', '..', '..', '..', '..', 'ionic-site');

  let dirData = await fsStat(ionicSitePath);
  if (!dirData.size) {
    // ionic-site not present
    console.error('ionic-site repo not found');
    return;
  }

  return copyDirectory(
    path.resolve(__dirname, '..', '..', '..', '..', 'docs'),
    path.resolve(ionicSitePath, 'content', 'docs', 'cli')
  );
}
