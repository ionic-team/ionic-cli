import * as chalk from 'chalk';
import * as stringWidth from 'string-width';

import {
  BackendFlag,
  CommandData,
  CommandInput,
  CommandOption,
  HydratedCommandData,
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

  const [ , slicedInputs, cmdOrNamespace ] = await env.namespace.locate(inputs);

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
  const cmdMetadataList = await ns.getCommandMetadataList();
  const formatList = (details: string[]) => details.map(hd => `    ${hd}\n`).join('');

  const globalCmds = await getCommandDetails(env, ns, cmdMetadataList.filter(cmd => cmd.type === 'global'));
  const projectCmds = await getCommandDetails(env, ns, cmdMetadataList.filter(cmd => cmd.type === 'project'));

  let output = '';

  if (ns.root) {
    output += `${await formatHeader(env)}\n`;
  }

  output += '\n' +
    `  ${chalk.bold('Usage')}:\n\n` +
    `${await formatUsage(env, ns)}\n` +
    (globalCmds.length > 0 ? `  ${chalk.bold('Global Commands')}:\n\n${formatList(globalCmds)}\n` : '') +
    (projectCmds.length > 0 ? `  ${chalk.bold('Project Commands')}:\n\n${env.project.directory ? formatList(projectCmds) : '    You are not in a project directory.\n'}\n` : '');

  return output;
}

async function formatUsage(env: IonicEnvironment, ns: INamespace) {
  let name = ns.name;

  if (!ns.root) {
    name = `ionic ${name}`; // TODO: recurse back ns chain
  }

  const options = ['--help', '--verbose', '--quiet', '--no-interactive', '--confirm'];
  const usageLines = [
    `<command> ${chalk.dim('[<args>]')} ${options.map(opt => chalk.dim('[' + opt + ']')).join(' ')} ${chalk.dim('[options]')}`,
  ];

  return usageLines.map(u => `    ${chalk.dim('$')} ${chalk.green(name + ' ' + u)}`).join('\n') + '\n';
}

async function formatHeader(env: IonicEnvironment) {
  const config = await env.config.load();
  const isLoggedIn = await env.session.isLoggedIn();

  return `   _             _
  (_)           (_)
   _  ___  _ __  _  ___
  | |/ _ \\| '_ \\| |/ __|
  | | (_) | | | | | (__
  |_|\\___/|_| |_|_|\\___|  CLI ${config.backend === BACKEND_PRO && isLoggedIn ? chalk.blue('PRO') + ' ' : ''}${env.plugins.ionic.meta.version}\n`;
}

async function getCommandDetails(env: IonicEnvironment, ns: INamespace, commands: HydratedCommandData[]): Promise<string[]> {
  const config = await env.config.load();
  commands = commands.filter(cmd => showIt(cmd, config.backend));

  const [ cmdDetails, nsDetails ] = await Promise.all([
    getListOfCommandDetails(env, commands.filter(cmd => cmd.namespace === ns)),
    getListOfNamespaceDetails(env, commands.filter(cmd => cmd.namespace !== ns)),
  ]);

  const details = [...cmdDetails, ...nsDetails];
  details.sort();
  return details;
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

async function getListOfCommandDetails(env: IonicEnvironment, commands: HydratedCommandData[]) {
  const fillStringArray = generateFillSpaceStringList(commands.map(cmd => cmd.fullName), HELP_DOTS_WIDTH, chalk.dim('.'));

  return commands.map((cmd, index) => {
    const description = cmd.description + `${cmd.aliases.length > 0 ? chalk.dim(' (alias' + (cmd.aliases.length === 1 ? '' : 'es') + ': ') + cmd.aliases.map((a) => chalk.green(a)).join(', ') + chalk.dim(')') : ''}`;
    const wrappedDescription = wordWrap(description, { indentation: HELP_DOTS_WIDTH + 6 });
    return `${chalk.green(cmd.fullName || '')} ${fillStringArray[index]} ${wrappedDescription}`;
  });
}

async function getListOfNamespaceDetails(env: IonicEnvironment, commands: HydratedCommandData[]) {
  const config = await env.config.load();

  const nsDescMap = new Map<string, string>();
  const grouped = commands.reduce((nsMap, cmd) => {
    if (showIt(cmd, config.backend)) { // TODO
      nsDescMap.set(cmd.namespace.name, cmd.namespace.description);
      let l = nsMap.get(cmd.namespace.name);

      if (!l) {
        l = [];
        nsMap.set(cmd.namespace.name, l);
      }

      l.push(cmd.name);
    }

    return nsMap;
  }, new Map<string, string[]>());

  const entries = [...grouped.entries()];
  const fillStringArray = generateFillSpaceStringList(entries.map(v => v[0] + ' <subcommand>'), HELP_DOTS_WIDTH, chalk.dim('.'));

  return entries.map((v, i) => {
    const subcommands = v[1].map(c => chalk.green(c)).join(', ');
    const wrappedDescription = wordWrap(`${nsDescMap.get(v[0])} ${chalk.dim('(subcommands:')} ${subcommands}${chalk.dim(')')}`, { indentation: HELP_DOTS_WIDTH + 6 });
    return `${chalk.green(v[0] + ' <subcommand>')} ${fillStringArray[i]} ${wrappedDescription}`;
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
  const usageLine = `${chalk.dim('$')} ${chalk.green('ionic ' + cmdMetadata.name + (typeof cmdMetadata.inputs === 'undefined' ? '' : ' ' + cmdMetadata.inputs.map(formatInput).join(' ')))} ${options.length > 0 ? chalk.green('[options]') : ''}`;

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

function showIt(thing: { name: string; visible?: boolean; backends?: BackendFlag[]; }, backend: BackendFlag): boolean {
  return thing.visible !== false && (!thing.backends || thing.backends.includes(backend));
}

async function filterOptionsForHelp(env: IonicEnvironment, options: CommandOption[] = []) {
  const config = await env.config.load();
  return options.filter(opt => showIt(opt, config.backend));
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
