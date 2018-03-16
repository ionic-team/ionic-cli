import chalk from 'chalk';

import { CommandHelpFormatter as BaseCommandHelpFormatter, MetadataGroup, NamespaceHelpFormatter as BaseNamespaceHelpFormatter, NamespaceHelpFormatterDeps as BaseNamespaceHelpFormatterDeps } from '@ionic/cli-framework';

import { CommandMetadata, CommandMetadataInput, CommandMetadataOption, HydratedCommandMetadata, ICommand, INamespace, IonicEnvironment, NamespaceMetadata } from '../definitions';
import { CommandGroup, NamespaceGroup, OptionGroup } from '../constants';
import { isCommand } from '../guards';

const IONIC_LOGO = String.raw`
   _             _
  (_) ___  _ __ (_) ___
  | |/ _ \| '_ \| |/ __|
  | | (_) | | | | | (__
  |_|\___/|_| |_|_|\___|`;

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
  const location = await env.namespace.locate(inputs);

  if (isCommand(location.obj)) {
    const formatter = new CommandHelpFormatter({ location, command: location.obj });
    env.log.rawmsg(await formatter.format());
  } else {
    if (location.args.length > 0) {
      env.log.error(
        `Unable to find command: ${chalk.green(inputs.join(' '))}` +
        (env.project.directory ? '' : '\nYou may need to be in an Ionic project directory.')
      );
    }

    const isLoggedIn = await env.session.isLoggedIn();
    const now = new Date();
    const prefix = isLoggedIn ? chalk.blue('PRO') + ' ' : '';
    const version = env.plugins.ionic.meta.pkg.version;
    const suffix = now.getMonth() === 9 && now.getDate() === 31 ? ' 🎃' : '';

    const formatter = new NamespaceHelpFormatter({
      inProject: env.project.directory ? true : false,
      version: prefix + version + suffix,
      location,
      namespace: location.obj,
    });

    env.log.rawmsg(await formatter.format());
  }
}

interface NamespaceHelpFormatterDeps extends BaseNamespaceHelpFormatterDeps<ICommand, INamespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {
  readonly inProject: boolean;
  readonly version: string;
}

class NamespaceHelpFormatter extends BaseNamespaceHelpFormatter<ICommand, INamespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {
  protected readonly inProject: boolean;
  protected readonly version: string;

  constructor({ version, inProject, ...rest }: NamespaceHelpFormatterDeps) {
    super(rest);
    this.inProject = inProject;
    this.version = version;
  }

  async formatHeader(): Promise<string> {
    return this.namespace.parent ? super.formatHeader() : this.formatIonicHeader();
  }

  async formatIonicHeader(): Promise<string> {
    return IONIC_LOGO + `  CLI ${this.version}\n\n`;
  }

  async formatBeforeNamespaceDescription(meta: NamespaceMetadata): Promise<string> {
    return formatGroupDecorations(NAMESPACE_DECORATIONS, meta.groups);
  }

  async formatBeforeCommandDescription(cmd: HydratedCommandMetadata): Promise<string> {
    return formatGroupDecorations(COMMAND_DECORATIONS, cmd.groups);
  }

  async getExtraOptions(): Promise<string[]> {
    return ['--verbose', '--quiet', '--no-interactive', '--no-color', '--confirm'];
  }

  async formatCommands() {
    const { strong } = this.colors;
    const commands = await this.namespace.getCommandMetadataList();
    const globalCmds = commands.filter(cmd => cmd.type === 'global');
    const projectCmds = commands.filter(cmd => cmd.type === 'project');

    return (
      (await this.formatCommandGroup('Global Commands', globalCmds)) +
      (this.inProject ? await this.formatCommandGroup('Project Commands', projectCmds) : `\n  ${strong('Project Commands')}:\n\n    You are not in a project directory.\n`)
    );
  }

  async filterCommandCallback(cmd: HydratedCommandMetadata): Promise<boolean> {
    const ns = await cmd.namespace.getMetadata();
    return (!cmd.groups || !cmd.groups.includes(CommandGroup.Hidden)) && (!ns.groups || !ns.groups.includes(NamespaceGroup.Hidden));
  }
}

class CommandHelpFormatter extends BaseCommandHelpFormatter<ICommand, INamespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {
  async formatBeforeOptionDescription(opt: CommandMetadataOption): Promise<string> {
    const { weak } = this.colors;

    return opt.hint ? `${weak(`[${opt.hint}]`)} ` : '';
  }

  async formatOptions(): Promise<string> {
    const metadata = await this.getCommandMetadata();
    const options = metadata.options ? metadata.options : [];

    const basicOptions = options.filter(o => !o.groups || !o.groups.includes(OptionGroup.Advanced));
    const advancedOptions = options.filter(o => o.groups && o.groups.includes(OptionGroup.Advanced));

    return (
      (await this.formatOptionsGroup('Options', basicOptions)) +
      (await this.formatOptionsGroup('Advanced Options', advancedOptions))
    );
  }

  filterOptionCallback(opt: CommandMetadataOption): boolean {
    return !opt.groups || !opt.groups.includes(OptionGroup.Hidden);
  }
}

function formatGroupDecorations(decorations: Decoration[], groups?: MetadataGroup[]): string {
  if (!groups) {
    return '';
  }

  const prepends = decorations.filter(([g]) => groups.includes(g)).map(([, d]) => d);
  return prepends.length ? prepends.join(' ') + ' ' : '';
}
