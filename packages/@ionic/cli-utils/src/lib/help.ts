import chalk from 'chalk';

import { CommandGroup, CommandHelpSchema as BaseCommandHelpSchema, CommandSchemaHelpFormatter as BaseCommandSchemaHelpFormatter, CommandStringHelpFormatter as BaseCommandStringHelpFormatter, NamespaceGroup, NamespaceHelpFormatterDeps as BaseNamespaceHelpFormatterDeps, NamespaceSchemaHelpFormatter as BaseNamespaceSchemaHelpFormatter, NamespaceStringHelpFormatter as BaseNamespaceStringHelpFormatter, OptionGroup } from '@ionic/cli-framework';

import { CommandMetadata, CommandMetadataInput, CommandMetadataOption, HydratedCommandMetadata, ICommand, INamespace, NamespaceMetadata } from '../definitions';

const IONIC_LOGO = String.raw`
   _             _
  (_) ___  _ __ (_) ___
  | |/ _ \| '_ \| |/ __|
  | | (_) | | | | | (__
  |_|\___/|_| |_|_|\___|`;

type Decoration = [string, string];

const COMMAND_DECORATIONS: Decoration[] = [
  [CommandGroup.Beta, chalk.red.bold('(beta)')],
  [CommandGroup.Deprecated, chalk.yellow.bold('(deprecated)')],
  [CommandGroup.Experimental, chalk.red.bold('(experimental)')],
];

const NAMESPACE_DECORATIONS: Decoration[] = [
  [NamespaceGroup.Beta, chalk.red.bold('(beta)')],
  [NamespaceGroup.Deprecated, chalk.yellow.bold('(deprecated)')],
  [NamespaceGroup.Experimental, chalk.red.bold('(experimental)')],
];

export async function isCommandHidden(cmd: HydratedCommandMetadata): Promise<boolean> {
  const ns = await cmd.namespace.getMetadata();
  return (!cmd.groups || !cmd.groups.includes(CommandGroup.Hidden)) && (!ns.groups || !ns.groups.includes(NamespaceGroup.Hidden));
}

export async function isOptionHidden(opt: CommandMetadataOption): Promise<boolean> {
  return !opt.groups || !opt.groups.includes(OptionGroup.Hidden);
}

export interface NamespaceHelpFormatterDeps extends BaseNamespaceHelpFormatterDeps<ICommand, INamespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {
  readonly inProject: boolean;
  readonly version: string;
}

export class NamespaceStringHelpFormatter extends BaseNamespaceStringHelpFormatter<ICommand, INamespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {
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

  async formatBeforeNamespaceSummary(meta: NamespaceMetadata): Promise<string> {
    return formatGroupDecorations(NAMESPACE_DECORATIONS, meta.groups);
  }

  async formatBeforeSummary(): Promise<string> {
    const metadata = await this.getNamespaceMetadata();
    return formatGroupDecorations(NAMESPACE_DECORATIONS, metadata.groups);
  }

  async formatBeforeCommandSummary(cmd: HydratedCommandMetadata): Promise<string> {
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
    return isCommandHidden(cmd);
  }
}

export class CommandStringHelpFormatter extends BaseCommandStringHelpFormatter<ICommand, INamespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {
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

  async filterOptionCallback(opt: CommandMetadataOption): Promise<boolean> {
    return isOptionHidden(opt);
  }

  async formatBeforeSummary(): Promise<string> {
    const metadata = await this.getCommandMetadata();
    return formatGroupDecorations(COMMAND_DECORATIONS, metadata.groups);
  }

  async formatBeforeOptionSummary(opt: CommandMetadataOption): Promise<string> {
    const { weak } = this.colors;

    return opt.hint ? `${weak(`[${opt.hint}]`)} ` : '';
  }
}

export class NamespaceSchemaHelpFormatter extends BaseNamespaceSchemaHelpFormatter<ICommand, INamespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {
  async filterCommandCallback(cmd: HydratedCommandMetadata): Promise<boolean> {
    return isCommandHidden(cmd);
  }

  async formatCommand(cmd: HydratedCommandMetadata): Promise<CommandHelpSchema> {
    const { command } = cmd;

    const formatter = new CommandSchemaHelpFormatter({
      location: { path: [...cmd.path], obj: command, args: [] },
      command,
      metadata: cmd,
    });

    return { ...await formatter.serialize(), type: cmd.type };
  }
}

export interface CommandHelpSchema extends BaseCommandHelpSchema {
  type: string;
}

export class CommandSchemaHelpFormatter extends BaseCommandSchemaHelpFormatter<ICommand, INamespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {
  async formatCommand(cmd: CommandMetadata | HydratedCommandMetadata): Promise<CommandHelpSchema> {
    const formatted = await super.formatCommand(cmd);

    return { ...formatted, type: cmd.type };
  }

  async filterOptionCallback(opt: CommandMetadataOption): Promise<boolean> {
    return isOptionHidden(opt);
  }
}

function formatGroupDecorations(decorations: Decoration[], groups?: string[]): string {
  if (!groups) {
    return '';
  }

  const prepends = decorations.filter(([g]) => groups.includes(g)).map(([, d]) => d);
  return prepends.length ? prepends.join(' ') + ' ' : '';
}
