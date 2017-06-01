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
import { CLI_FLAGS } from './config';
import { indent, generateFillSpaceStringList, wordWrap } from './utils/format';

const HELP_DOTS_WIDTH = 25;

export async function showHelp(env: IonicEnvironment, inputs: string[]) {
  // If there are no inputs then show global command details.
  if (inputs.length === 0) {
    return env.log.msg(await getFormattedHelpDetails(env, env.namespace, inputs));
  }

  const [ , slicedInputs, cmdOrNamespace ] = env.namespace.locate(inputs);

  if (!isCommand(cmdOrNamespace)) {
    let extra = '';

    if (!env.project.directory) {
      extra = '\nYou may need to be in an Ionic project directory.';
    }

    if (slicedInputs.length > 0) {
      env.log.error(`Unable to find command: ${chalk.green(inputs.join(' '))}${extra}\n`);
    }
  }

  env.log.msg(await formatHelp(env, cmdOrNamespace, inputs));
}

async function formatHelp(env: IonicEnvironment, cmdOrNamespace: ICommand | INamespace, inputs: string[]) {
  // If the command is located on the global namespace then show its help
  if (!isCommand(cmdOrNamespace)) {
    return getFormattedHelpDetails(env, cmdOrNamespace, inputs);
  }

  const command = cmdOrNamespace;

  return formatCommandHelp(env, command.metadata);
}

async function getFormattedHelpDetails(env: IonicEnvironment, ns: INamespace, inputs: string[]) {
  const globalMetadata = ns.getCommandMetadataList();
  const formatList = (details: string[]) => details.map(hd => `    ${hd}\n`).join('');

  if (ns.root) {
    const globalCommandDetails = getHelpDetails(env, globalMetadata, [cmd => cmd.type === 'global']);
    const projectCommandDetails = getHelpDetails(env, globalMetadata, [cmd => cmd.type === 'project']);

    return `${formatHeader(env)}\n\n` +
      `  ${chalk.bold('Usage')}:\n\n` +
      `${await formatUsage(env)}\n` +
      `  ${chalk.bold('Global Commands')}:\n\n` +
      `${formatList(globalCommandDetails)}\n` +
      `  ${chalk.bold('Project Commands')}:\n\n` +
      `${env.project.directory ? formatList(projectCommandDetails) : '    You are not in a project directory.\n'}\n`;
  } else {
    const commandDetails = getHelpDetails(env, globalMetadata, []);
    return `\n  ${chalk.bold('Commands')}:\n\n` +
      `${formatList(commandDetails)}\n`;
  }
}

async function formatUsage(env: IonicEnvironment) {
  const config = await env.config.load();
  const cliFlags = CLI_FLAGS.filter(f => f.visible).map(f => `--${config.cliFlags[f.flag] === false ? '' : 'no-'}${f.flag}`);
  const options = ['--help', '--verbose', '--quiet'];
  const usageLines = [
    `<command> ${options.map(opt => chalk.dim('[' + opt + ']')).join(' ')} ${chalk.dim('[<args>] [options]')}`,
    wordWrap(`${cliFlags.map(f => chalk.dim('[' + f + ']')).join(' ')}`, { indentation: 12 }),
  ];

  return usageLines.map(u => `    ${chalk.dim('$')} ${chalk.green('ionic ' + u)}`).join('\n') + '\n';
}

function formatHeader(env: IonicEnvironment) {
  return `   _             _
  (_)           (_)
   _  ___  _ __  _  ___
  | |/ _ \\| '_ \\| |/ __|
  | | (_) | | | | | (__
  |_|\\___/|_| |_|_|\\___|  CLI ${env.plugins.ionic.version}\n`;
}

function getHelpDetails(env: IonicEnvironment, commandMetadataList: CommandData[], filters: ((cmd: CommandData) => boolean)[] = []): string[] {
  for (let f of filters) {
    commandMetadataList = commandMetadataList.filter(f);
  }

  const foundCommandList = commandMetadataList.filter((cmd) => cmd.visible !== false);

  return getListOfCommandDetails(foundCommandList);
}

async function formatCommandHelp(env: IonicEnvironment, cmdMetadata: CommandData) {
  if (!cmdMetadata.fullName) {
    cmdMetadata.fullName = cmdMetadata.name;
  }

  const displayCmd = 'ionic ' + cmdMetadata.fullName;
  const wrappedDescription = wordWrap(cmdMetadata.description, { indentation: displayCmd.length + 5 });

  return `
  ${chalk.bold(chalk.green(displayCmd) + ' - ' + wrappedDescription)}${formatLongDescription(cmdMetadata.longDescription)}
  ` +
  (await formatCommandUsage(env, cmdMetadata.inputs, cmdMetadata.fullName)) +
  formatCommandInputs(cmdMetadata.inputs) +
  formatCommandOptions(cmdMetadata.options) +
  formatCommandExamples(cmdMetadata.exampleCommands, cmdMetadata.fullName);
}

function getListOfCommandDetails(cmdMetadataList: CommandData[]): string[] {
  const fillStringArray = generateFillSpaceStringList(cmdMetadataList.map(cmdMd => cmdMd.fullName || cmdMd.name), HELP_DOTS_WIDTH, chalk.dim('.'));

  return cmdMetadataList.map((cmdMd, index) => {
    const description = cmdMd.description + `${cmdMd.aliases && cmdMd.aliases.length > 0 ? chalk.dim(' (alias' + (cmdMd.aliases.length === 1 ? '' : 'es') + ': ') + cmdMd.aliases.map((a) => chalk.green(a)).join(', ') + chalk.dim(')') : ''}`;
    const wrappedDescription = wordWrap(description, { indentation: HELP_DOTS_WIDTH + 6 });
    return `${chalk.green(cmdMd.fullName || '')} ${fillStringArray[index]} ${wrappedDescription}`;
  });
}

async function formatCommandUsage(env: IonicEnvironment, inputs: CommandInput[] = [], commandName: string) {
  const config = await env.config.load();
  const formatInput = (input: CommandInput) => {
    if (!config.cliFlags.interactive && input.required !== false) {
      return '<' + input.name + '>';
    }

    return '[<' + input.name + '>]';
  };

  const usageLine = `${chalk.dim('$')} ${chalk.green('ionic ' + commandName + ' ' + inputs.map(formatInput).join(' '))}`;

  return `
  ${chalk.bold('Usage')}:

    ${usageLine}
  `;
}

function formatLongDescription(longDescription?: string) {
  if (!longDescription) {
    return '';
  }

  longDescription = longDescription.trim();
  longDescription = wordWrap(longDescription, { indentation: 4 });

  return '\n\n    ' + longDescription;
}

function formatCommandInputs(inputs: CommandInput[] = []): string {
  if (inputs.length === 0) {
    return '';
  }

  const fillStrings = generateFillSpaceStringList(inputs.map(input => input.name), HELP_DOTS_WIDTH, chalk.dim('.'));

  function inputLineFn({ name, description}: CommandOption, index: number) {
    const optionList = chalk.green(`${name}`);
    const wrappedDescription = wordWrap(description, { indentation: HELP_DOTS_WIDTH + 6 });

    return `${optionList} ${fillStrings[index]} ${wrappedDescription}`;
  }

  return `
  ${chalk.bold('Inputs')}:

    ${inputs.map(inputLineFn).join(`
    `)}
  `;
}

function formatOptionDefault(opt: CommandOption) {
  if (typeof opt.default === 'string') {
    return chalk.dim(' (default: ') + chalk.green(opt.default) + chalk.dim(')');
  } else {
    return '';
  }
}

function formatOptionLine(opt: CommandOption) {
  const showInverse = opt.type === Boolean && opt.default === true && opt.name.length > 1;
  const optionList = (showInverse ? chalk.green(`--no-${opt.name}`) : chalk.green(`-${opt.name.length > 1 ? '-' : ''}${opt.name}`)) +
    (!showInverse && opt.aliases && opt.aliases.length > 0 ? ', ' +
      opt.aliases
      .map((alias) => chalk.green(`-${alias}`))
      .join(', ') : '');

  const optionListLength = stringWidth(optionList);
  const fullLength = optionListLength > HELP_DOTS_WIDTH ? optionListLength + 1 : HELP_DOTS_WIDTH;
  const wrappedDescription = wordWrap(opt.description + formatOptionDefault(opt), { indentation: HELP_DOTS_WIDTH + 6 });

  return `${optionList} ${Array(fullLength - optionListLength).fill(chalk.dim('.')).join('')} ${wrappedDescription}`;
}

function formatCommandOptions(options: CommandOption[] = []): string {
  if (options.length === 0) {
    return '';
  }

  return `
  ${chalk.bold('Options')}:

    ${options.map(formatOptionLine).join(`
    `)}
  `;
}

function formatCommandExamples(exampleCommands: string[] | undefined, commandName: string): string {
  if (!Array.isArray(exampleCommands)) {
    return '';
  }

  const exampleLines = exampleCommands.map(cmd => {
    const sepIndex = cmd.indexOf(' -- ');

    if (sepIndex === -1) {
      cmd = chalk.green(cmd);
    } else {
      cmd = chalk.green(cmd.substring(0, sepIndex)) + cmd.substring(sepIndex);
    }

    const wrappedCmd = wordWrap(cmd, { indentation: 12, append: ' \\' });

    return `${chalk.dim('$')} ${chalk.green('ionic ' + commandName)} ${wrappedCmd}`;
  });

  return `
  ${chalk.bold('Examples')}:

    ${exampleLines.join(`
    `)}
  `;
}
