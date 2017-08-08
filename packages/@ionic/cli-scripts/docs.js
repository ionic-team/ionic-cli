#!/usr/bin/env node

const path = require('path');

const style = require('ansi-styles');
const escapeStringRegexp = require('escape-string-regexp');

const ionicPkg = require(path.resolve(__dirname, '..', '..', 'ionic'));
const utilsPkg = require(path.resolve(__dirname, '..', 'cli-utils'));

function getCmds(env) {
  return env.namespace.getCommandMetadataList().filter(cmd => cmd.visible !== false && (!cmd.backends || cmd.backends.includes('legacy')));
}

async function run() {
  const env = await utilsPkg.generateIonicEnvironment(ionicPkg, process.argv.slice(2), process.env);

  const nsPath = path.resolve(__dirname, '..', '..', '..', 'docs', 'index.md');
  const nsDoc = formatIonicPage(env);

  await utilsPkg.fsMkdirp(path.dirname(nsPath));
  await utilsPkg.fsWriteFile(nsPath, nsDoc, { encoding: 'utf8' });

  const commands = getCmds(env);
  const commandPromises = commands.map(async (cmd) => {
    const cmdPath = path.resolve(__dirname, '..', '..', '..', 'docs', ...cmd.fullName.split(' '), 'index.md');
    const cmdDoc = formatCommandDoc(env, cmd);

    await utilsPkg.fsMkdirp(path.dirname(cmdPath));
    await utilsPkg.fsWriteFile(cmdPath, cmdDoc, { encoding: 'utf8' });
  });

  await Promise.all(commandPromises);
  await copyToIonicSite(commands);

  env.close();
}

run().then(() => console.log('done!')).catch((err) => console.error(err));

function formatIonicPage(env) {
  const stripAnsi = env.load('strip-ansi');
  const headerLine = formatNamespaceHeader(env.namespace);

  function listCommandLink(cmdData) {
    return `[${cmdData.fullName}](${path.join(...cmdData.fullName.split(' '))}/) | ${stripAnsi(cmdData.description)}`;
  }

  const commands = getCmds(env);

  return `${headerLine}

The Ionic CLI is your go-to tool for developing Ionic apps. You can follow CLI
development on [Github](https://github.com/ionic-team/ionic-cli).

## Installation

Please make sure latest
[Node](https://ionicframework.com/docs/resources/what-is/#node) 6 LTS and
[NPM](https://ionicframework.com/docs/resources/what-is/#npm) 3+ are installed.

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
${commands.map(listCommandLink).join(`
`)}
`;
}

function formatNamespaceHeader(ns) {
  return `---
layout: fluid/docs_base
category: cli
id: cli-intro
title: Ionic CLI Documentation
---

# ${ns.name}
`;
}

function formatCommandHeader(cmd) {
  return `---
layout: fluid/docs_base
category: cli
id: cli-${cmd.fullName.split(' ').join('-')}
command_name: ${cmd.fullName}
title: Ionic CLI Documentation - ${cmd.fullName}
header_sub_title: Ionic CLI
---

# \`$ ionic ${cmd.fullName}\`

`;
}

function links2md(str) {
  return str.replace(/((http|https):\/\/(\w+:{0,1}\w*@)?([^\s\*\)`]+)(\/|\/([\w#!:.?+=&%@!\-\/]))?)/g, '[$1]($1)');
}

function ansi2md(str) {
  str = convertAnsiToMd(str, style.green, { open: '`', close: '`' });
  str = convertAnsiToMd(str, style.bold, { open: '**', close: '**' });
  return str;
}

function convertAnsiToMd(str, style, md) {
  return str.replace(new RegExp(escapeStringRegexp(style.open), 'g'), md.open).replace(new RegExp(escapeStringRegexp(style.close), 'g'), md.close);
}

function formatCommandDoc(env, cmdMetadata) {
  const stripAnsi = env.load('strip-ansi');
  const description = stripAnsi(cmdMetadata.description).split('\n').join('\n  ');
  let longDescription = cmdMetadata.longDescription;

  if (longDescription) {
    longDescription = stripAnsi(links2md(ansi2md(longDescription.trim())));
  }

  return formatCommandHeader(cmdMetadata) +
    formatName(cmdMetadata.fullName, description) +
    formatSynopsis(cmdMetadata.inputs, cmdMetadata.fullName) +
    formatDescription(env, cmdMetadata.inputs, cmdMetadata.options, longDescription) +
    formatExamples(cmdMetadata.exampleCommands, cmdMetadata.fullName);
}

function formatName(fullName, description) {
  return description;
}

function formatSynopsis(inputs, commandName) {
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


function formatDescription(env, inputs = [], options = [], longDescription = '') {
  options = options.filter(o => o.visible !== false && (!o.backends || o.backends.includes('legacy')));
  const stripAnsi = env.load('strip-ansi');
  const headerLine = `## Details`;

  function inputLineFn(input, index) {
    const name = input.name;
    const description = stripAnsi(ansi2md(input.description));
    const optionList = `\`${name}\``;

    return `${optionList} | ${description}`;
  }

  function optionLineFn(option) {
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
  const ionicSitePath = path.resolve(__dirname, '..', '..', '..', '..', 'ionic-site');

  let dirData = await utilsPkg.fsStat(ionicSitePath);
  if (!dirData.size) {
    // ionic-site not present
    console.error('ionic-site repo not found');
    return;
  }

  // get a list of commands for the nav
  await utilsPkg.fsWriteFile(
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

  return utilsPkg.copyDirectory(
    path.resolve(__dirname, '..', '..', '..', 'docs'),
    path.resolve(ionicSitePath, 'content', 'docs', 'cli'));
}

