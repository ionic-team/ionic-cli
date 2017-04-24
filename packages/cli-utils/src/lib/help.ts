import * as chalk from 'chalk';
import * as stringWidth from 'string-width';

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
import { generateFillSpaceStringList } from './utils/format';
import { promptToInstallPlugin } from './plugins';

import { KNOWN_PLUGINS, ORG_PREFIX, PLUGIN_PREFIX } from './plugins';

export async function showHelp(env: IonicEnvironment, inputs: string[]) {
  // If there are no inputs then show global command details.
  if (inputs.length === 0) {
    return env.log.msg(getFormattedHelpDetails(env, env.namespace, inputs));
  }

  const [slicedInputs, cmdOrNamespace] = env.namespace.locate(inputs);

  if (!isCommand(cmdOrNamespace)) {
    let extra = '';

    if (env.project.directory) {
      if (KNOWN_PLUGINS.indexOf(slicedInputs[0]) !== -1) {
        await promptToInstallPlugin(env, `${ORG_PREFIX}/${PLUGIN_PREFIX}${slicedInputs[0]}`, {});
      }
    } else {
      extra = '\nYou may need to be in an Ionic project directory.';
    }

    if (slicedInputs.length > 0) {
      env.log.error(`Unable to find command: ${chalk.bold(inputs.join(' '))}.${extra}`);
    }
  }

  env.log.msg(formatHelp(env, cmdOrNamespace, inputs));
}

export function formatHelp(env: IonicEnvironment, cmdOrNamespace: ICommand | INamespace, inputs: string[]) {
  // If the command is located on the global namespace then show its help
  if (!isCommand(cmdOrNamespace)) {
    return getFormattedHelpDetails(env, cmdOrNamespace, inputs);
  }

  const command = cmdOrNamespace;

  return formatCommandHelp(command.metadata);
}

export function getFormattedHelpDetails(env: IonicEnvironment, ns: INamespace, inputs: string[]) {
  const globalMetadata = ns.getCommandMetadataList();

  const formatList = (details: string[]) => details.map(hd => `    ${hd}\n`).join('');

  if (ns.root) {
    const globalCommandDetails = getHelpDetails(env, globalMetadata, [(cmd: CommandData) => cmd.type === 'global']);
    const projectCommandDetails = getHelpDetails(env, globalMetadata, [(cmd: CommandData) => cmd.type === 'project']);

    return `${formatHeader(env)}\n\n` +
      `  ${chalk.bold('Usage')}:\n\n` +
      `    ${chalk.dim('$')} ${chalk.green('ionic <command> [args/options]')}\n` +
      `    ${chalk.dim('$')} ${chalk.green('ionic help <command>')} (for command details)\n\n` +
      `  ${chalk.bold('Global Commands')}:\n\n` +
      `${formatList(globalCommandDetails)}\n` +
      `  ${chalk.bold('Project Commands')}:\n\n` +
      `${formatList(projectCommandDetails)}`;
  } else {
    const commandDetails = getHelpDetails(env, globalMetadata, []);
    return `\n  ${chalk.bold('Commands')}:\n\n` +
      `${formatList(commandDetails)}`;
  }
}

function formatHeader(env: IonicEnvironment) {
  return `   _             _
  (_)           (_)
   _  ___  _ __  _  ___
  | |/ _ \\| '_ \\| |/ __|
  | | (_) | | | | | (__
  |_|\\___/|_| |_|_|\\___|  CLI ${env.versions.cli}\n`;
}

function getHelpDetails(env: IonicEnvironment, commandMetadataList: CommandData[], filters: ((cmd: CommandData) => boolean)[] = []): string[] {
  for (let f of filters) {
    commandMetadataList = commandMetadataList.filter(f);
  }

  const foundCommandList = commandMetadataList.filter((cmd) => typeof cmd.visible === 'undefined' ? true : cmd.visible);

  return getListOfCommandDetails(foundCommandList);
}

export function formatCommandHelp(cmdMetadata: CommandData): string {
  if (!cmdMetadata.fullName) {
    cmdMetadata.fullName = cmdMetadata.name;
  }

  return `
  ${chalk.bold(cmdMetadata.description)}
  ` +
  formatCommandUsage(cmdMetadata.inputs, cmdMetadata.fullName) +
  formatCommandInputs(cmdMetadata.inputs) +
  formatCommandOptions(cmdMetadata.options) +
  formatCommandExamples(cmdMetadata.exampleCommands, cmdMetadata.fullName);
}

export function getListOfCommandDetails(cmdMetadataList: CommandData[]): string[] {
  const fillStringArray = generateFillSpaceStringList(cmdMetadataList.map(cmdMd => cmdMd.fullName || cmdMd.name), 20, chalk.dim('.'));

  return cmdMetadataList.map((cmdMd, index) =>
    `${chalk.green(cmdMd.fullName || '')} ` +
    `${fillStringArray[index]} ` +
    `${cmdMd.description}` +
    `${cmdMd.aliases && cmdMd.aliases.length > 0 ? ' (alias' + (cmdMd.aliases.length === 1 ? '' : 'es') + ': ' + cmdMd.aliases.map((a) => chalk.green(a)).join(', ') + ')' : ''}`
  );
}

function formatCommandUsage(inputs: CommandInput[] = [], commandName: string): string {
  const formatInput = (input: CommandInput) => {
    if (input.validators && (input.validators.includes(validators.required) && !input.prompt)) {
      return '<' + input.name + '>';
    }

    return '[' + input.name + ']';
  };

  const usageLine = `$ ${chalk.green('ionic ' + commandName + ' ' + inputs.map(formatInput).join(' '))}`;

  return `
  ${chalk.bold('Usage')}:
    ${usageLine}
  `;
}

function formatCommandInputs(inputs: CommandInput[] = []): string {
  if (inputs.length === 0) {
    return '';
  }

  const fillStrings = generateFillSpaceStringList(inputs.map(input => input.name), 25, chalk.dim('.'));

  function inputLineFn({ name, description}: CommandOption, index: number) {
    const optionList = chalk.green(`${name}`);

    return `${optionList} ${fillStrings[index]} ${description}`;
  };

  return `
  ${chalk.bold('Inputs')}:
    ${inputs.map(inputLineFn).join(`
    `)}
  `;
}

function formatCommandOptions(options: CommandOption[] = []): string {
  if (options.length === 0) {
    return '';
  }

  function optionLineFn(opt: CommandOption) {
    const optionList = chalk.green(`-${opt.name.length > 1 ? '-' : ''}${opt.name}`) +
      (opt.aliases && opt.aliases.length > 0 ? ', ' +
       opt.aliases
         .map((alias) => chalk.green(`-${alias}`))
         .join(', ') : '');

    const optionListLength = stringWidth(optionList);
    const fullLength = optionListLength > 25 ? optionListLength + 1 : 25;

    return `${optionList} ${Array(fullLength - optionListLength).fill(chalk.dim('.')).join('')} ${opt.description}${typeof opt.default === 'string' ? ' (default: ' + chalk.green(opt.default) + ')' : ''}`;
  };

  return `
  ${chalk.bold('Options')}:
    ${options.map(optionLineFn).join(`
    `)}
  `;
}

function formatCommandExamples(exampleCommands: string[] | undefined, commandName: string): string {
  if (!Array.isArray(exampleCommands)) {
    return '';
  }

  const exampleLines = exampleCommands.map(cmd => `$ ionic ${commandName} ${cmd} `);

  return `
  ${chalk.bold('Examples')}:
    ${exampleLines.join(`
    `)}
  `;
}
