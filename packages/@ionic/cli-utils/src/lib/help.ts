import chalk from 'chalk';

import { MetadataGroup, validators } from '@ionic/cli-framework';
import { generateFillSpaceStringList, stringWidth, wordWrap } from '@ionic/cli-framework/utils/format';

import {
  BackendFlag,
  CommandMetadata,
  CommandMetadataInput,
  CommandMetadataOption,
  HydratedCommandData,
  ICommand,
  INamespace,
  IonicEnvironment,
  NamespaceMetadata,
} from '../definitions';

import { CommandGroup, NamespaceGroup, OptionGroup } from '../constants';
import { isCommand } from '../guards';

import { BACKEND_PRO } from './backends';

const HELP_DOTS_WIDTH = 25;

export async function showHelp(env: IonicEnvironment, inputs: string[]): Promise<void> {
  // If there are no inputs then show global command details.
  if (inputs.length === 0) {
    return env.log.msg(await getFormattedHelpDetails(env, env.namespace, ''));
  }

  const { args, obj, path } = await env.namespace.locate(inputs);

  if (!isCommand(obj) && args.length > 0) {
    env.log.error(
      `Unable to find command: ${chalk.green(inputs.join(' '))}` +
      (env.project.directory ? '' : '\nYou may need to be in an Ionic project directory.')
    );
  }

  const fullName = path.map(([p]) => p).join(' ');

  env.log.msg(await formatHelp(env, obj, fullName));
}

async function formatHelp(env: IonicEnvironment, cmdOrNamespace: ICommand | INamespace, fullName: string) {
  // If the command is located on the global namespace then show its help
  if (!isCommand(cmdOrNamespace)) {
    return getFormattedHelpDetails(env, cmdOrNamespace, fullName);
  }

  const command = cmdOrNamespace;

  return formatCommandHelp(env, await command.getMetadata(), fullName);
}

async function getFormattedHelpDetails(env: IonicEnvironment, ns: INamespace, fullName: string) {
  const cmdMetadataList = await ns.getCommandMetadataList();
  const formatList = (details: string[]) => details.map(hd => `    ${hd}\n`).join('');

  const globalCmds = await getCommandDetails(env, ns, cmdMetadataList.filter(cmd => cmd.type === 'global'));
  const projectCmds = await getCommandDetails(env, ns, cmdMetadataList.filter(cmd => cmd.type === 'project'));

  return `${await formatNamespaceHeader(env, ns, cmdMetadataList, fullName)}

  ${chalk.bold('Usage')}:

${await formatUsage(env, ns)}

` + (globalCmds.length > 0 ? `  ${chalk.bold('Global Commands')}:\n\n${formatList(globalCmds)}\n` : '')
  + (projectCmds.length > 0 ? `  ${chalk.bold('Project Commands')}:\n\n${env.project.directory ? formatList(projectCmds) : '    You are not in a project directory.\n'}\n` : '');
}

async function formatNamespaceHeader(env: IonicEnvironment, ns: INamespace, cmdMetadataList: HydratedCommandData[], fullName: string) {
  if (!ns.parent) {
    return formatHeader(env);
  }

  const metadata = await ns.getMetadata();

  return `
  ${chalk.bold.green(fullName)} ${chalk.bold('-')} ${metadata.groups && metadata.groups.includes(NamespaceGroup.Deprecated) ? chalk.yellow.bold('(deprecated)') + ' ' : ''}${chalk.bold(metadata.description)}${formatLongDescription(metadata.longDescription)}`;
}

async function formatHeader(env: IonicEnvironment) {
  const config = await env.config.load();
  const isLoggedIn = await env.session.isLoggedIn();

  const now = new Date();
  const prefix = config.backend === BACKEND_PRO && isLoggedIn ? chalk.blue('PRO') + ' ' : '';
  const version = env.plugins.ionic.meta.pkg.version;
  const suffix = now.getMonth() === 9 && now.getDate() === 31 ? ' 🎃' : '';

  return `   _             _
  (_) ___  _ __ (_) ___
  | |/ _ \\| '_ \\| |/ __|
  | | (_) | | | | | (__
  |_|\\___/|_| |_|_|\\___|  CLI ${prefix}${version}${suffix}\n`;
}

async function formatUsage(env: IonicEnvironment, ns: INamespace) {
  const metadata = await ns.getMetadata();
  let name = metadata.name;

  if (ns.parent) {
    name = `ionic ${name}`; // TODO: recurse back ns chain
  }

  const options = ['--help', '--verbose', '--quiet', '--no-interactive', '--confirm'];
  const usageLines = [
    `<command> ${chalk.dim('[<args>]')} ${options.map(opt => chalk.dim('[' + opt + ']')).join(' ')} ${chalk.dim('[options]')}`,
  ];

  return usageLines.map(u => `    ${chalk.dim('$')} ${chalk.green(name + ' ' + u)}`).join('\n') + '\n';
}

async function getCommandDetails(env: IonicEnvironment, ns: INamespace, commands: HydratedCommandData[]): Promise<string[]> {
  const config = await env.config.load();
  commands = commands.filter(cmd => showCommand(cmd, config.backend));

  const [ cmdDetails, nsDetails ] = await Promise.all([
    getListOfCommandDetails(env, commands.filter(cmd => cmd.namespace === ns)),
    getListOfNamespaceDetails(env, commands.filter(cmd => cmd.namespace !== ns)),
  ]);

  const details = [...cmdDetails, ...nsDetails];
  details.sort();
  return details;
}

async function formatCommandHelp(env: IonicEnvironment, cmdMetadata: CommandMetadata, fullName: string) {
  const wrappedDescription = wordWrap(cmdMetadata.description, { indentation: fullName.length + 5 });

  return `
  ${chalk.bold(chalk.green(fullName) + ' - ' + wrappedDescription)}${formatLongDescription(cmdMetadata.longDescription)}
  ` +
  (await formatCommandUsage(env, cmdMetadata, fullName)) +
  (await formatCommandInputs(env, cmdMetadata.inputs)) +
  (await formatCommandOptions(env, cmdMetadata.options)) +
  (await formatCommandExamples(env, cmdMetadata.exampleCommands, fullName));
}

async function getListOfCommandDetails(env: IonicEnvironment, commands: HydratedCommandData[]) {
  const wow = commands.map(cmd => cmd.path.map(([p]) => p).join(' '));
  const fillStringArray = generateFillSpaceStringList(wow, HELP_DOTS_WIDTH, chalk.dim('.'));

  return commands.map((cmd, index) => {
    const description = (cmd.groups && cmd.groups.includes(CommandGroup.Deprecated) ? chalk.yellow.bold('(deprecated)') + ' ' : '') + cmd.description + `${cmd.aliases.length > 0 ? chalk.dim(' (alias' + (cmd.aliases.length === 1 ? '' : 'es') + ': ') + cmd.aliases.map(a => chalk.green(a)).join(', ') + chalk.dim(')') : ''}`;
    const wrappedDescription = wordWrap(description, { indentation: HELP_DOTS_WIDTH + 6 });
    return `${chalk.green(cmd.path.map(p => p[0]).join(' '))} ${fillStringArray[index]} ${wrappedDescription}`;
  });
}

async function getListOfNamespaceDetails(env: IonicEnvironment, commands: HydratedCommandData[]) {
  const config = await env.config.load();

  const descriptions = new Map<string, string>();
  const grouped = new Map<string, { meta: NamespaceMetadata; cmds: HydratedCommandData[]; }>();

  await Promise.all(commands.map(async cmd => {
    if (showCommand(cmd, config.backend)) {
      const nsmeta = await cmd.namespace.getMetadata();
      descriptions.set(nsmeta.name, nsmeta.description);
      let entry = grouped.get(nsmeta.name);

      if (!entry) {
        entry = { meta: nsmeta, cmds: [] };
        grouped.set(nsmeta.name, entry);
      }

      entry.cmds.push(cmd);
    }
  }));

  const entries = [...grouped.entries()];
  const fillStringArray = generateFillSpaceStringList(entries.map(([name]) => name + ' <subcommand>'), HELP_DOTS_WIDTH, chalk.dim('.'));

  return entries.map(([name, { meta, cmds }], i) => {
    const subcommands = cmds.map(c => chalk.green(c.name)).join(', ');
    const wrappedDescription = wordWrap(`${meta.groups && meta.groups.includes(NamespaceGroup.Deprecated) ? chalk.yellow.bold('(deprecated)') + ' ' : ''}${descriptions.get(name)} ${chalk.dim('(subcommands:')} ${subcommands}${chalk.dim(')')}`, { indentation: HELP_DOTS_WIDTH + 6 });
    return `${chalk.green(name + ' <subcommand>')} ${fillStringArray[i]} ${wrappedDescription}`;
  });
}

async function formatCommandUsage(env: IonicEnvironment, cmdMetadata: CommandMetadata, fullName: string) {
  const formatInput = (input: CommandMetadataInput) => {
    if (!env.flags.interactive && input.validators && input.validators.includes(validators.required)) {
      return '<' + input.name + '>';
    }

    return '[<' + input.name + '>]';
  };

  const options = await filterOptionsForHelp(env, cmdMetadata.options);
  const usageLine = `${chalk.dim('$')} ${chalk.green(fullName + (typeof cmdMetadata.inputs === 'undefined' ? '' : ' ' + cmdMetadata.inputs.map(formatInput).join(' ')))} ${options.length > 0 ? chalk.green('[options]') : ''}`;

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

async function formatCommandInputs(env: IonicEnvironment, inputs: CommandMetadataInput[] = []) {
  if (inputs.length === 0) {
    return '';
  }

  const fillStrings = generateFillSpaceStringList(inputs.map(input => input.name), HELP_DOTS_WIDTH, chalk.dim('.'));

  function inputLineFn({ name, description}: CommandMetadataOption, index: number) {
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

function formatOptionDefault(opt: CommandMetadataOption) {
  if (typeof opt.default === 'string') {
    return chalk.dim(' (default: ') + chalk.green(opt.default) + chalk.dim(')');
  } else {
    return '';
  }
}

function formatOptionLine(opt: CommandMetadataOption) {
  const showInverse = opt.type === Boolean && opt.default === true && opt.name.length > 1;
  const optionList = (showInverse ? chalk.green(`--no-${opt.name}`) : chalk.green(`-${opt.name.length > 1 ? '-' : ''}${opt.name}`)) +
    (!showInverse && opt.aliases && opt.aliases.length > 0 ? ', ' +
      opt.aliases
      .map(alias => chalk.green(`-${alias}`))
      .join(', ') : '');

  const optionListLength = stringWidth(optionList);
  const fullLength = optionListLength > HELP_DOTS_WIDTH ? optionListLength + 1 : HELP_DOTS_WIDTH;
  const wrappedDescription = wordWrap(opt.description + formatOptionDefault(opt), { indentation: HELP_DOTS_WIDTH + 6 });

  return `${optionList} ${Array(fullLength - optionListLength).fill(chalk.dim('.')).join('')} ${wrappedDescription}`;
}

function showCommand(thing: { name: string; groups?: MetadataGroup[]; backends?: BackendFlag[]; }, backend: BackendFlag): boolean {
  return !thing.groups || !thing.groups.includes(CommandGroup.Hidden) && (!thing.backends || thing.backends.includes(backend));
}

function showOption(thing: { name: string; groups?: MetadataGroup[]; backends?: BackendFlag[]; }, backend: BackendFlag): boolean {
  return !thing.groups || !thing.groups.includes(OptionGroup.Hidden) && (!thing.backends || thing.backends.includes(backend));
}

async function filterOptionsForHelp(env: IonicEnvironment, options: CommandMetadataOption[] = []) {
  const config = await env.config.load();
  return options.filter(opt => showOption(opt, config.backend));
}

async function formatCommandOptions(env: IonicEnvironment, options: CommandMetadataOption[] = []) {
  options = await filterOptionsForHelp(env, options);

  if (options.length === 0) {
    return '';
  }

  const basicOptions = options.filter(o => !o.groups || !o.groups.includes(OptionGroup.Advanced));
  const advancedOptions = options.filter(o => o.groups && o.groups.includes(OptionGroup.Advanced));

  const basicOptionsOutput = basicOptions.length > 0 ? `
  ${chalk.bold('Options')}:

    ${basicOptions.map(formatOptionLine).join(`
    `)}
  ` : '';

  const advancedOptionsOutput = advancedOptions.length > 0 ? `
  ${chalk.bold('Advanced Options')}:

    ${advancedOptions.map(formatOptionLine).join(`
    `)}
  ` : '';

  return basicOptionsOutput + advancedOptionsOutput;
}

async function formatCommandExamples(env: IonicEnvironment, exampleCommands: string[] | undefined, fullName: string) {
  if (!Array.isArray(exampleCommands)) {
    return '';
  }

  const exampleLines = exampleCommands.map(cmd => {
    const sepIndex = cmd.indexOf(' -- ');
    cmd = sepIndex === -1 ? chalk.green(cmd) : chalk.green(cmd.substring(0, sepIndex)) + cmd.substring(sepIndex);
    const wrappedCmd = wordWrap(cmd, { indentation: 12, append: ' \\' });

    return `${chalk.dim('$')} ${chalk.green(fullName)} ${wrappedCmd}`;
  });

  return `
  ${chalk.bold('Examples')}:

    ${exampleLines.join(`
    `)}
  `;
}
