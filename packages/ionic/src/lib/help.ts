import { CommandGroup, CommandHelpSchema as BaseCommandHelpSchema, CommandSchemaHelpFormatter as BaseCommandSchemaHelpFormatter, CommandStringHelpFormatter as BaseCommandStringHelpFormatter, NamespaceGroup, NamespaceHelpFormatterDeps as BaseNamespaceHelpFormatterDeps, NamespaceSchemaHelpFormatter as BaseNamespaceSchemaHelpFormatter, NamespaceStringHelpFormatter as BaseNamespaceStringHelpFormatter, OptionGroup, formatOptionName, isOptionVisible } from '@ionic/cli-framework';
import { filter } from '@ionic/cli-framework/utils/array';
import chalk from 'chalk';

import { CommandMetadata, CommandMetadataInput, CommandMetadataOption, HydratedCommandMetadata, ICommand, INamespace, NamespaceMetadata } from '../definitions';

import { GLOBAL_OPTIONS } from './config';

const IONIC_LOGO = String.raw`
   _             _
  (_) ___  _ __ (_) ___
  | |/ _ \| '_ \| |/ __|
  | | (_) | | | | | (__
  |_|\___/|_| |_|_|\___|`;

type Decoration = [string, string];

const OPTION_DECORATIONS: Decoration[] = [
  [OptionGroup.Beta, chalk.red.bold('(beta)')],
  [OptionGroup.Deprecated, chalk.yellow.bold('(deprecated)')],
  [OptionGroup.Experimental, chalk.red.bold('(experimental)')],
];

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

  async getGlobalOptions(): Promise<string[]> {
    const visibleOptions = await filter(GLOBAL_OPTIONS, async opt => isOptionVisible(opt));
    return visibleOptions.map(opt => formatOptionName(opt, { showAliases: false }));
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

  async formatBeforeSummary(): Promise<string> {
    const metadata = await this.getCommandMetadata();
    return formatGroupDecorations(COMMAND_DECORATIONS, metadata.groups);
  }

  async formatBeforeOptionSummary(opt: CommandMetadataOption): Promise<string> {
    return (opt.hint ? `${opt.hint} ` : '') + formatGroupDecorations(OPTION_DECORATIONS, opt.groups);
  }
}

export class NamespaceSchemaHelpFormatter extends BaseNamespaceSchemaHelpFormatter<ICommand, INamespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {
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
}

function formatGroupDecorations(decorations: Decoration[], groups?: string[]): string {
  if (!groups) {
    return '';
  }

  const prepends = decorations.filter(([g]) => groups.includes(g)).map(([, d]) => d);
  return prepends.length ? prepends.join(' ') + ' ' : '';
}
