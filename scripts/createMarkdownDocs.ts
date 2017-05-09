import * as path from 'path';

import { generateIonicEnvironment } from '../packages/ionic';
import {
  CommandData,
  CommandInput,
  CommandOption,
  copyDirectory,
  INamespace,
  fsMkdirp,
  fsStat,
  fsWriteFile,
  installPlugin,
  load,
  readDir,
  validators,
} from '../packages/cli-utils';

const stripAnsi = load('strip-ansi');

async function run() {
  const env = await generateIonicEnvironment(process.argv.slice(2), process.env);
  const mPath = path.resolve(__dirname, '..', 'packages');
  const ionicModules = (await readDir(mPath))
    .filter(m => m.startsWith('cli-plugin-'))
    .map(m => require(path.resolve(mPath, m)));

  for (let mod of ionicModules) {
    installPlugin(env, mod);
  }

  const nsPath = path.resolve(__dirname, '..', 'docs', 'index.md');
  const nsDoc = formatIonicPage(env.namespace);

  await fsMkdirp(path.dirname(nsPath));
  await fsWriteFile(nsPath, nsDoc, { encoding: 'utf8' });

  const commands = env.namespace.getCommandMetadataList().filter(cmd => cmd.visible !== false);
  const commandPromises = commands.map(async (cmd) => {
    if (!cmd.fullName) {
      console.error(`${cmd.name} has no fullName`);
      return;
    }

    const cmdPath = path.resolve(__dirname, '..', 'docs', ...cmd.fullName.split(' '), 'index.md');
    const cmdDoc = formatCommandDoc(cmd);

    await fsMkdirp(path.dirname(cmdPath));
    await fsWriteFile(cmdPath, cmdDoc, { encoding: 'utf8' });
  });

  await Promise.all(commandPromises);
  await copyToIonicSite(commands);

  env.close();
}

run().then(() => console.log('done!')).catch(err => console.error(err));


function formatIonicPage(ns: INamespace) {
  let headerLine = formatNamespaceHeader(ns);

  function listCommandLink(cmdData: CommandData) {
    if (!cmdData.fullName) {
      console.error(`${cmdData.name} has no fullName`);
      return;
    }

    return `[${cmdData.fullName}](${path.join(...cmdData.fullName.split(' '))}) | ${stripAnsi(cmdData.description)}`;
  }

  const commands = ns.getCommandMetadataList();

  return `${headerLine}

The Ionic CLI is your go-to tool for developing Ionic apps. You can follow CLI
development on [Github](https://github.com/driftyco/ionic-cli).

## Installation

Please make sure
[Node](https://ionicframework.com/docs/resources/what-is/#node) 6+ and
[NPM](https://ionicframework.com/docs/resources/what-is/#npm) 3+ are
installed.

Then, install the CLI globally (you may need sudo):

\`\`\`bash
$ npm install -g ionic@latest
\`\`\`

## Getting Started

Start a new Ionic project using \`ionic start\`:

\`\`\`bash
ionic start myNewProject tabs
cd ./myNewProject
\`\`\`

This will create a new app named \`myNewProject\`. Once you \`cd\` into your
project's directory, a few new commands become available to you, such as
\`serve\`:

\`\`\`bash
ionic serve
\`\`\`

## Commands

Here is a full list of Ionic commands. You can also see the list on the command
line with \`ionic --help\`.

Command | Description
------- | -----------
${commands.filter(cmd => cmd.visible !== false).map(listCommandLink).join(`
`)}
`;
}

function formatNamespaceHeader(ns: INamespace) {
  return `---
layout: fluid/docs_base
category: cli
id: cli-intro
title: Ionic CLI Documentation
---

# ${ns.name}
`;
}

function formatCommandHeader(cmd: CommandData) {
  if (!cmd.fullName) {
    console.error(`${cmd.name} has no fullName`);
    return;
  }

  return `---
layout: fluid/docs_base
category: cli
id: cli-${cmd.fullName.split(' ').join('-')}
command_name: ${cmd.fullName}
title: ${cmd.fullName}
header_sub_title: Ionic CLI
---

# \`$ ionic ${cmd.fullName}\`

`;
}

function formatCommandDoc(cmdMetadata: CommandData) {
  let description = stripAnsi(cmdMetadata.description).split('\n').join('\n  ');

  return formatCommandHeader(cmdMetadata) +
    formatName(cmdMetadata.fullName || '', description) +
    formatSynopsis(cmdMetadata.inputs, cmdMetadata.fullName) +
    formatDescription(cmdMetadata.inputs, cmdMetadata.options, description) +
    formatExamples(cmdMetadata.exampleCommands, cmdMetadata.fullName);
}

function formatName(fullName: string, description: string) {
  return description;
}

function formatSynopsis(inputs, commandName) {
  const headerLine = `## Synopsis`;
  const usageLine =
      `${commandName} ${
        (inputs || [])
          .map(input => {
            if (input.validators && input.validators.includes(validators.required)) {
              return '<' + input.name + '>';
            }
            return '[' + input.name + ']';
          })
          .join(' ')}`;

  return `
${headerLine}

\`\`\`bash
$ ionic ${usageLine}
\`\`\`
  `;
}


function formatDescription(inputs: CommandInput[] = [], options: CommandOption[] = [], description: string = '') {
  const headerLine = `## Details`;

  function inputLineFn(input, index) {
    const name = input.name;
    const description = stripAnsi(input.description);
    const optionList = `\`${name}\``;

    return `${optionList} | ${description}`;
  };

  function optionLineFn(option) {
    const name = option.name;
    const aliases = option.aliases;
    const description = stripAnsi(option.description);

    const optionList = `\`--${name}\`` +
      (aliases && aliases.length > 0 ? ', ' +
       aliases
         .map((alias) => `\`-${alias}\``)
         .join(', ') : '');

    return `${optionList} | ${description}`;
  };


  return `
${headerLine}

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

function formatExamples(exampleCommands, commandName) {
  if (!Array.isArray(exampleCommands)) {
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

async function copyToIonicSite(commands) {
  const ionicSitePath = path.resolve(__dirname, '..', '..', 'ionic-site');

  let dirData = await fsStat(ionicSitePath);
  if (!dirData.size) {
    // ionic-site not present, fail silently
    return;
  }

  // get a list of commands for the nav
  await fsWriteFile(
    path.resolve(ionicSitePath, 'content', '_data', 'cliData.json'),
    JSON.stringify(
      commands.map((command) => {
        return {
          id: `cli-${command.fullName.split(' ').join('-')}`,
          name: command.fullName,
          url: command.fullName.split(' ').join('/')
        };
      }).sort((a, b) => a.name.localeCompare(b.name))
    ), { encoding: 'utf8' });

  return copyDirectory(
    path.resolve(__dirname, '..', 'docs'),
    path.resolve(ionicSitePath, 'content', 'docs', 'cli'));
}

