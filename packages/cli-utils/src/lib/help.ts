import * as chalk from 'chalk';

import {
  CommandData,
  CommandInput,
  CommandOption,
  IonicEnvironment,
  ICommand,
  INamespace,
} from '../definitions';
import { isCommand } from '../guards';
import { validators } from './validators';
import { STRIP_ANSI_REGEX, generateFillSpaceStringList } from './utils/format';

import { ERROR_PLUGIN_NOT_INSTALLED, KNOWN_PLUGINS, ORG_PREFIX, PLUGIN_PREFIX, loadPlugin } from './plugins';

export async function showHelp(env: IonicEnvironment, inputs: string[]) {
  const inProject = env.project.directory ? true : false;

  // If there are no inputs then show global command details.
  if (inputs.length === 0) {
    return env.log.msg(getFormattedHelpDetails(env.namespace, inputs, inProject));
  }

  const [slicedInputs, cmdOrNamespace] = env.namespace.locate(inputs);

  if (!isCommand(cmdOrNamespace)) {
    let extra = '';

    if (env.project.directory) {
      if (KNOWN_PLUGINS.indexOf(slicedInputs[0]) !== -1) {
        try {
          await loadPlugin(env.project.directory, `${ORG_PREFIX}/${PLUGIN_PREFIX}${slicedInputs[0]}`);
        } catch (e) {
          if (e !== ERROR_PLUGIN_NOT_INSTALLED) {
            throw e;
          }
        }
      }
    } else {
      extra = '\nYou may need to be in an Ionic project directory.';
    }

    if (slicedInputs.length > 0) {
      env.log.error(`Unable to find command: ${chalk.bold(inputs.join(' '))}.${extra}`);
    }
  }

  env.log.msg(formatHelp(cmdOrNamespace, inputs, inProject));
}

export function formatHelp(cmdOrNamespace: ICommand | INamespace, inputs: string[], inProject: boolean = false) {
  // If the command is located on the global namespace then show its help
  if (!isCommand(cmdOrNamespace)) {
    return getFormattedHelpDetails(cmdOrNamespace, inputs, inProject);
  }

  const command = cmdOrNamespace;

  return formatCommandHelp(command.metadata);
}

export function getFormattedHelpDetails(ns: INamespace, inputs: string[], inProject: boolean = false) {
  const globalMetadata = ns.getCommandMetadataList();
  const details = getHelpDetails(globalMetadata, inputs);

  return `\n${chalk.bold(`Help Details:`)}\n\n${details.map(hd => `  ${hd}\n`).join('')}`;
}

function getHelpDetails(commandMetadataList: CommandData[], argv: string[], inProject: boolean = false): string[] {
  const foundCommandList: CommandData[] = commandMetadataList
    .filter((cmd) => !cmd.unlisted)
    .filter((cmd) => !cmd.requiresProject || (cmd.requiresProject && !inProject));

  // No command was found if the length is zero.
  if (foundCommandList.length === 0) {
    throw 'UNKNOWN_COMMAND';
  }

  // We have a list so show the name and description
  return getListOfCommandDetails(foundCommandList);
}

export function formatCommandHelp(cmdMetadata: CommandData): string {
  let description = cmdMetadata.description.split('\n').join('\n  ');
  if (!cmdMetadata.fullName) {
    cmdMetadata.fullName = cmdMetadata.name;
  }

  return `
  ${chalk.bold(description)}
  ` +
  formatCommandUsage(cmdMetadata.inputs, cmdMetadata.fullName) +
  formatCommandInputs(cmdMetadata.inputs) +
  formatCommandOptions(cmdMetadata.options) +
  formatCommandExamples(cmdMetadata.exampleCommands, cmdMetadata.fullName);
}

export function getListOfCommandDetails(cmdMetadataList: CommandData[]): string[] {
  const fillStringArray = generateFillSpaceStringList(cmdMetadataList.map(cmdMd => cmdMd.fullName || cmdMd.name), 18, '.');

  return cmdMetadataList.map((cmdMd, index) =>
    `${chalk.green(cmdMd.fullName || '')} ` +
    `${fillStringArray[index]} ` +
    `${cmdMd.description}` +
    `${cmdMd.aliases && cmdMd.aliases.length > 0 ? ' (alias' + (cmdMd.aliases.length === 1 ? '' : 'es') + ': ' + cmdMd.aliases.map((a) => chalk.green(a)).join(', ') + ')' : ''}`
  );
}

function formatCommandUsage(inputs: CommandInput[] = [], commandName: string): string {
  const headerLine = chalk.bold(`Usage`);
  const usageLine =
      `$ ionic ${commandName} ${
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
      ${usageLine}
  `;
}

function formatCommandInputs(inputs: CommandInput[] = []): string {
  if (inputs.length === 0) {
    return '';
  }

  const headerLine = chalk.bold(`Inputs`);

  const fillStrings = generateFillSpaceStringList(inputs.map(input => input.name), 25, '.');

  function inputLineFn({ name, description}: CommandOption, index: number) {
    const optionList = chalk.green(`${name}`);

    return `${optionList} ${fillStrings[index]} ${description}`;
  };

  return `
    ${headerLine}
      ${inputs.map(inputLineFn).join(`
      `)}
  `;
}

function formatCommandOptions(options: CommandOption[] = []): string {
  if (options.length === 0) {
    return '';
  }

  const headerLine = chalk.bold(`Options`);

  function optionLineFn({ name, aliases, description}: CommandOption) {
    const optionList = chalk.green(`-${name.length > 1 ? '-' : ''}${name}`) +
      (aliases && aliases.length > 0 ? ', ' +
       aliases
         .map((alias) => chalk.green(`-${alias}`))
         .join(', ') : '');

    const optionListLength = optionList.replace(STRIP_ANSI_REGEX, '').length;
    const fullLength = optionListLength > 25 ? optionListLength + 1 : 25;

    return `${optionList} ${Array(fullLength - optionListLength).fill('.').join('')} ${description}`;
  };

  return `
    ${headerLine}
      ${options.map(optionLineFn).join(`
      `)}
  `;
}

function formatCommandExamples(exampleCommands: string[] | undefined, commandName: string): string {
  if (!Array.isArray(exampleCommands)) {
    return '';
  }

  const headerLine = chalk.bold(`Examples`);
  const exampleLines = exampleCommands.map(cmd => `$ ionic ${commandName} ${cmd} `);

  return `
    ${headerLine}
      ${exampleLines.join(`
      `)}
  `;
}
