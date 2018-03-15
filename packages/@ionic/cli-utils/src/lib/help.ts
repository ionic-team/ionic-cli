import chalk from 'chalk';

import { MetadataGroup, validators } from '@ionic/cli-framework';
import { generateFillSpaceStringList, stringWidth, wordWrap } from '@ionic/cli-framework/utils/format';

import {
  CommandMetadata,
  CommandMetadataInput,
  CommandMetadataOption,
  HydratedCommandMetadata,
  INamespace,
  IonicEnvironment,
  NamespaceLocateResult,
  NamespaceMetadata,
} from '../definitions';

import { CommandGroup, NamespaceGroup, OptionGroup } from '../constants';
import { isCommand } from '../guards';

const HELP_DOTS_WIDTH = 25;

type Decoration = [number, string];

const COMMAND_DECORATIONS: Decoration[] = [
  [CommandGroup.Beta, chalk.red.bold('(beta)')],
  [CommandGroup.Deprecated, chalk.yellow.bold('(deprecated)')],
];

const NAMESPACE_DECORATIONS: Decoration[] = [
  [NamespaceGroup.Beta, chalk.red.bold('(beta)')],
  [NamespaceGroup.Deprecated, chalk.yellow.bold('(deprecated)')],
];

export async function showHelp(env: IonicEnvironment, inputs: string[]): Promise<void> {
  // If there are no inputs then show global command details.
  if (inputs.length === 0) {
    return env.log.rawmsg(await formatNamespaceHelp(env, env.namespace, ''));
  }

  const location = await env.namespace.locate(inputs);

  if (!isCommand(location.obj) && location.args.length > 0) {
    env.log.error(
      `Unable to find command: ${chalk.green(inputs.join(' '))}` +
      (env.project.directory ? '' : '\nYou may need to be in an Ionic project directory.')
    );
  }

  const fullName = location.path.map(([p]) => p).join(' ');

  env.log.rawmsg(await formatHelp(env, location, fullName));
}

async function formatHelp(env: IonicEnvironment, location: NamespaceLocateResult, fullName: string) {
  // If the command is located on the global namespace then show its help
  if (!isCommand(location.obj)) {
    return formatNamespaceHelp(env, location.obj, fullName);
  }

  const command = location.obj;

  return formatCommandHelp(env, await command.getMetadata({ location }), fullName);
}

async function formatNamespaceHelp(env: IonicEnvironment, ns: INamespace, fullName: string) {
  const cmdMetadataList = await ns.getCommandMetadataList();
  const formatList = (details: string[]) => details.map(hd => `    ${hd}\n`).join('');

  const globalCmds = await getCommandDetails(ns, cmdMetadataList.filter(cmd => cmd.type === 'global'));
  const projectCmds = await getCommandDetails(ns, cmdMetadataList.filter(cmd => cmd.type === 'project'));

  return `${await formatNamespaceHeader(env, ns, cmdMetadataList, fullName)}

  ${chalk.bold('Usage')}:

${await formatUsage(env, ns)}
` + (globalCmds.length > 0 ? `  ${chalk.bold('Global Commands')}:\n\n${formatList(globalCmds)}\n` : '')
  + (projectCmds.length > 0 ? `  ${chalk.bold('Project Commands')}:\n\n${env.project.directory ? formatList(projectCmds) : '    You are not in a project directory.\n'}\n` : '');
}

function formatGroupDecorations(decorations: Decoration[], groups?: MetadataGroup[]): string {
  if (!groups) {
    return '';
  }

  const prepends = decorations.filter(([g]) => groups.includes(g)).map(([, d]) => d);
  return prepends.length ? prepends.join(' ') + ' ' : '';
}

async function formatNamespaceHeader(env: IonicEnvironment, ns: INamespace, cmdMetadataList: HydratedCommandMetadata[], fullName: string) {
  if (!ns.parent) {
    return formatHeader(env);
  }

  const metadata = await ns.getMetadata();

  return `
  ${chalk.bold.green(fullName)} ${chalk.bold('-')} ${formatGroupDecorations(NAMESPACE_DECORATIONS, metadata.groups)}${chalk.bold(metadata.description)}${formatLongDescription(metadata.longDescription)}`;
}

async function formatHeader(env: IonicEnvironment) {
  const isLoggedIn = await env.session.isLoggedIn();

  const now = new Date();
  const prefix = isLoggedIn ? chalk.blue('PRO') + ' ' : '';
  const version = env.plugins.ionic.meta.pkg.version;
  const suffix = now.getMonth() === 9 && now.getDate() === 31 ? ' 🎃' : '';

  return `   _             _
  (_) ___  _ __ (_) ___
  | |/ _ \\| '_ \\| |/ __|
  | | (_) | | | | | (__
  |_|\\___/|_| |_|_|\\___|  CLI ${prefix}${version}${suffix}\n`;
}

async function compileNamespacePath(ns: INamespace, name = ''): Promise<string> {
  const metadata = await ns.getMetadata();
  name = metadata.name + (name ? ` ${name}` : '');
  return ns.parent ? compileNamespacePath(ns.parent, name) : name;
}

async function formatUsage(env: IonicEnvironment, ns: INamespace) {
  const name = await compileNamespacePath(ns);

  const options = ['--help', '--verbose', '--quiet', '--no-interactive', '--no-color', '--confirm'];
  const usageLines = [
    `<command> ${chalk.dim('[<args>]')} ${options.map(opt => chalk.dim('[' + opt + ']')).join(' ')} ${chalk.dim('[options]')}`,
  ];

  return usageLines.map(u => `    ${chalk.dim('$')} ${chalk.green(name + ' ' + u)}`).join('\n') + '\n';
}

async function getCommandDetails(ns: INamespace, commands: HydratedCommandMetadata[]): Promise<string[]> {
  commands = commands.filter(cmd => !cmd.groups || !cmd.groups.includes(CommandGroup.Hidden));

  const [ cmdDetails, nsDetails ] = await Promise.all([
    getListOfCommandDetails(commands.filter(cmd => cmd.namespace === ns)),
    getListOfNamespaceDetails(commands.filter(cmd => cmd.namespace !== ns)),
  ]);

  const details = [...cmdDetails, ...nsDetails];
  details.sort();
  return details;
}

async function formatCommandHelp(env: IonicEnvironment, metadata: CommandMetadata, fullName: string) {
  const isHidden = metadata.groups && metadata.groups.includes(CommandGroup.Hidden);

  if (isHidden) {
    env.log.warn(`${chalk.green(fullName)} is a hidden command. These docs may not be helpful.`);
  }

  return formatCommandHeader(metadata, fullName) +
    (await formatCommandUsage(env, metadata, fullName)) +
    (await formatCommandInputs(metadata.inputs)) +
    (await formatCommandOptions(metadata.options)) +
    (await formatCommandExamples(metadata.exampleCommands, fullName));
}

function formatCommandHeader(metadata: CommandMetadata, fullName: string) {
  const wrappedDescription = wordWrap(metadata.description, { indentation: fullName.length + 5 });
  const subtitle = (formatGroupDecorations(COMMAND_DECORATIONS, metadata.groups)) + wrappedDescription;

  return `\n  ${chalk.bold(chalk.green(fullName) + (subtitle ? ` - ${subtitle}` : ''))}${formatLongDescription(metadata.longDescription)}\n`;
}

async function getListOfCommandDetails(commands: HydratedCommandMetadata[]) {
  const fullCmd = commands.map(cmd => cmd.path.map(([p]) => p).join(' '));
  const fillStringArray = generateFillSpaceStringList(fullCmd, HELP_DOTS_WIDTH, chalk.dim('.'));

  return commands.map((cmd, index) => {
    const description = (formatGroupDecorations(COMMAND_DECORATIONS, cmd.groups)) + cmd.description + `${cmd.aliases.length > 0 ? chalk.dim(' (alias' + (cmd.aliases.length === 1 ? '' : 'es') + ': ') + cmd.aliases.map(a => chalk.green(a)).join(', ') + chalk.dim(')') : ''}`;
    const wrappedDescription = wordWrap(description, { indentation: HELP_DOTS_WIDTH + 6 });
    return `${chalk.green(cmd.path.map(p => p[0]).join(' '))} ${fillStringArray[index]} ${wrappedDescription}`;
  });
}

async function getListOfNamespaceDetails(commands: HydratedCommandMetadata[]) {
  const descriptions = new Map<string, string>();
  const grouped = new Map<string, { meta: NamespaceMetadata; cmds: HydratedCommandMetadata[]; }>();

  await Promise.all(commands.map(async cmd => {
    if (!cmd.groups || !cmd.groups.includes(CommandGroup.Hidden)) {
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
    const wrappedDescription = wordWrap(`${formatGroupDecorations(NAMESPACE_DECORATIONS, meta.groups)}${descriptions.get(name)} ${chalk.dim('(subcommands:')} ${subcommands}${chalk.dim(')')}`, { indentation: HELP_DOTS_WIDTH + 6 });
    return `${chalk.green(name + ' <subcommand>')} ${fillStringArray[i]} ${wrappedDescription}`;
  });
}

async function formatCommandUsage(env: IonicEnvironment, metadata: CommandMetadata, fullName: string) {
  const formatInput = (input: CommandMetadataInput) => {
    if (!env.flags.interactive && input.validators && input.validators.includes(validators.required)) {
      return '<' + input.name + '>';
    }

    return '[<' + input.name + '>]';
  };

  const options = await filterOptionsForHelp(metadata.options);
  const usageLine = `${chalk.dim('$')} ${chalk.green(fullName + (typeof metadata.inputs === 'undefined' ? '' : ' ' + metadata.inputs.map(formatInput).join(' ')))} ${options.length > 0 ? chalk.green('[options]') : ''}`;

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

async function formatCommandInputs(inputs: CommandMetadataInput[] = []) {
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
  const wrappedDescription = wordWrap((opt.hint ? `${chalk.dim(`[${opt.hint}]`)} ` : '') + opt.description + formatOptionDefault(opt), { indentation: HELP_DOTS_WIDTH + 6 });

  return `${optionList} ${chalk.dim('.').repeat(fullLength - optionListLength)} ${wrappedDescription}`;
}

async function filterOptionsForHelp(options: CommandMetadataOption[] = []) {
  return options.filter(opt => !opt.groups || !opt.groups.includes(OptionGroup.Hidden));
}

async function formatCommandOptions(options: CommandMetadataOption[] = []) {
  options = await filterOptionsForHelp(options);

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

async function formatCommandExamples(exampleCommands: string[] | undefined, fullName: string) {
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
