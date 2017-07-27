import * as chalk from 'chalk';
import * as stringWidth from 'string-width';

import {
  CommandData,
  CommandInput,
  CommandOption,
  ICommand,
  INamespace,
  IonicEnvironment,
} from '../definitions';

import { isCommand } from '../guards';
import { BACKEND_PRO } from './backends';
import { generateFillSpaceStringList, wordWrap } from './utils/format';

const HELP_DOTS_WIDTH = 25;

export async function showHelp(env: IonicEnvironment, inputs: string[]): Promise<void | number> {
  let code = 0;

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
      code = 1;
    }
  }

  env.log.msg(await formatHelp(env, cmdOrNamespace, inputs));
  return code;
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
    const globalCommandDetails = await getHelpDetails(env, globalMetadata, [cmd => cmd.type === 'global']);
    const projectCommandDetails = await getHelpDetails(env, globalMetadata, [cmd => cmd.type === 'project']);

    return `${await formatHeader(env)}\n\n` +
      `  ${chalk.bold('Usage')}:\n\n` +
      `${await formatUsage(env)}\n` +
      `  ${chalk.bold('Global Commands')}:\n\n` +
      `${formatList(globalCommandDetails)}\n` +
      `  ${chalk.bold('Project Commands')}:\n\n` +
      `${env.project.directory ? formatList(projectCommandDetails) : '    You are not in a project directory.\n'}\n`;
  } else {
    const commandDetails = await getHelpDetails(env, globalMetadata, []);
    return `\n  ${chalk.bold('Commands')}:\n\n` +
      `${formatList(commandDetails)}\n`;
  }
}

async function formatUsage(env: IonicEnvironment) {
  const options = ['--help', '--verbose', '--quiet', '--no-interactive', '--confirm'];
  const usageLines = [
    `<command> ${chalk.dim('[<args>]')} ${options.map(opt => chalk.dim('[' + opt + ']')).join(' ')} ${chalk.dim('[options]')}`,
  ];

  return usageLines.map(u => `    ${chalk.dim('$')} ${chalk.green('ionic ' + u)}`).join('\n') + '\n';
}

async function formatHeader(env: IonicEnvironment) {
  const config = await env.config.load();
  const isLoggedIn = await env.session.isLoggedIn();

  return `   _             _
  (_)           (_)
   _  ___  _ __  _  ___
  | |/ _ \\| '_ \\| |/ __|
  | | (_) | | | | | (__
  |_|\\___/|_| |_|_|\\___|  CLI ${config.backend === BACKEND_PRO && isLoggedIn ? chalk.blue('PRO') + ' ': ''}${env.plugins.ionic.version}\n`;
}

async function getHelpDetails(env: IonicEnvironment, commandMetadataList: CommandData[], filters: ((cmd: CommandData) => boolean)[] = []): Promise<string[]> {
  const config = await env.config.load();

  for (let f of filters) {
    commandMetadataList = commandMetadataList.filter(f);
  }

  const foundCommandList = commandMetadataList.filter((cmd) => cmd.visible !== false && (!cmd.backends || cmd.backends.includes(config.backend)));

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
  (await formatCommandUsage(env, cmdMetadata)) +
  (await formatCommandInputs(env, cmdMetadata.inputs)) +
  (await formatCommandOptions(env, cmdMetadata.options)) +
  (await formatCommandExamples(env, cmdMetadata.exampleCommands, cmdMetadata.fullName));
}

function getListOfCommandDetails(cmdMetadataList: CommandData[]): string[] {
  const fillStringArray = generateFillSpaceStringList(cmdMetadataList.map(cmdMd => cmdMd.fullName || cmdMd.name), HELP_DOTS_WIDTH, chalk.dim('.'));

  return cmdMetadataList.map((cmdMd, index) => {
    const description = cmdMd.description + `${cmdMd.aliases && cmdMd.aliases.length > 0 ? chalk.dim(' (alias' + (cmdMd.aliases.length === 1 ? '' : 'es') + ': ') + cmdMd.aliases.map((a) => chalk.green(a)).join(', ') + chalk.dim(')') : ''}`;
    const wrappedDescription = wordWrap(description, { indentation: HELP_DOTS_WIDTH + 6 });
    return `${chalk.green(cmdMd.fullName || '')} ${fillStringArray[index]} ${wrappedDescription}`;
  });
}

async function formatCommandUsage(env: IonicEnvironment, cmdMetadata: CommandData) {
  const formatInput = (input: CommandInput) => {
    if (!env.flags.interactive && input.required !== false) {
      return '<' + input.name + '>';
    }

    return '[<' + input.name + '>]';
  };

  const options = await filterOptionsForHelp(env, cmdMetadata.options);
  const usageLine = `${chalk.dim('$')} ${chalk.green('ionic ' + cmdMetadata.name + ' ' + (cmdMetadata.inputs && cmdMetadata.inputs.map(formatInput).join(' ')))} ${options.length > 0 ? chalk.green('[options]') : ''}`;

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

async function formatCommandInputs(env: IonicEnvironment, inputs: CommandInput[] = []) {
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

async function filterOptionsForHelp(env: IonicEnvironment, options: CommandOption[] = []) {
  const config = await env.config.load();
  return options.filter(opt => opt.visible !== false && (!opt.backends || opt.backends.includes(config.backend)));
}

async function formatCommandOptions(env: IonicEnvironment, options: CommandOption[] = []) {
  options = await filterOptionsForHelp(env, options);

  if (options.length === 0) {
    return '';
  }

  return `
  ${chalk.bold('Options')}:

    ${options.map(formatOptionLine).join(`
    `)}
  `;
}

async function formatCommandExamples(env: IonicEnvironment, exampleCommands: string[] | undefined, commandName: string) {
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
