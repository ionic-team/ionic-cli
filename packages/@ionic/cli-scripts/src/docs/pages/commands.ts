import stripAnsi = require('strip-ansi');

import { generateCommandPath } from '@ionic/cli-framework';
import { CommandGroup, CommandMetadata, CommandMetadataInput, CommandMetadataOption, HydratedCommandMetadata, IonicEnvironment, OptionGroup } from '@ionic/cli-utils';

import { ansi2md, formatPageHeader, getWarning, links2md } from '../utils';

export default async function(env: IonicEnvironment) {
  const commands = await getCommandList(env);

  async function listCommandLink(cmd: HydratedCommandMetadata) {
    const fullName = await generateFullName(cmd);
    return `[${fullName}](${fullName.split(' ').join('/')}/) | ${cmd.groups && cmd.groups.includes(CommandGroup.Deprecated) ? '(deprecated) ' : ''}${stripAnsi(cmd.description)}`;
  }

  const commandLinks = await Promise.all(commands.map(async cmd => listCommandLink(cmd)));

  commandLinks.sort();

  return `${formatPageHeader('Commands', 'cli-command-list')}

This is a comprehensive list of CLI commands. Running \`ionic --help\` will also show a list of commands.

Command | Description
------- | -----------
${commandLinks.join(`
`)}
`;
}

function formatCommandHeader(cmd: HydratedCommandMetadata, fullName: string) {
  return `---
layout: fluid/cli_docs_base
category: cli
id: cli-${fullName.split(' ').join('-')}
page_name: ionic ${fullName}
command_name: ionic ${fullName}
title: ionic ${fullName} - Ionic CLI Documentation
header_sub_title: Ionic CLI
---

${getWarning()}

# \`$ ionic ${fullName}\`

`;
}

export async function formatCommandDoc(env: IonicEnvironment, cmd: HydratedCommandMetadata) {
  const description = stripAnsi(cmd.description).split('\n').join('\n  ');

  const fullName = await generateFullName(cmd);

  return formatCommandHeader(cmd, fullName) +
    formatName(fullName, description) +
    formatSynopsis(cmd.inputs || [], fullName) +
    formatDescription(env, cmd) +
    formatExamples(cmd.exampleCommands || [], fullName);
}

export async function getCommandList(env: IonicEnvironment): Promise<(HydratedCommandMetadata & CommandMetadata)[]> {
  const cmds = await env.namespace.getCommandMetadataList();
  return cmds.filter(cmd => !cmd.groups || !cmd.groups.includes(CommandGroup.Hidden));
}

export async function generateFullName(cmd: HydratedCommandMetadata) {
  const cmdPath = await generateCommandPath(cmd.command);
  const fullName = cmdPath.map(([p]) => p).slice(1).join(' '); // strip off 'ionic' from beginning

  return fullName;
}

function formatName(fullName: string, description: string) {
  return description;
}

function formatSynopsis(inputs: CommandMetadataInput[], commandName: string) {
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

function formatDescription(env: IonicEnvironment, cmd: HydratedCommandMetadata) {
  let longDescription = cmd.longDescription;

  if (longDescription) {
    longDescription = stripAnsi(links2md(ansi2md(longDescription.trim())));
  }

  const inputs = cmd.inputs || [];
  let options = cmd.options || [];

  options = options.filter(o => !o.groups || !o.groups.includes(OptionGroup.Hidden));

  const headerLine = `## Details`;

  function inputLineFn(input: CommandMetadataInput, index: number) {
    const name = input.name;
    const description = stripAnsi(ansi2md(input.description));
    const optionList = `\`${name}\``;

    return `${optionList} | ${description}`;
  }

  function optionLineFn(option: CommandMetadataOption) {
    const showInverse = option.type === Boolean && option.default === true && option.name.length > 1;
    const name = showInverse ? `--no-${option.name}` : `-${option.name.length > 1 ? '-' : ''}${option.name}`;
    const aliases = option.aliases;
    const description = stripAnsi(ansi2md(option.description));

    const optionList = `\`${name}\`` +
      (aliases && aliases.length > 0 ? ', ' +
       aliases
         .map(alias => `\`-${alias}\``)
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
