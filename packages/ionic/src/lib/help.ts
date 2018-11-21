import { CommandHelpSchema as BaseCommandHelpSchema, CommandSchemaHelpFormatter as BaseCommandSchemaHelpFormatter, CommandStringHelpFormatter as BaseCommandStringHelpFormatter, NO_COLORS, NamespaceHelpFormatterDeps as BaseNamespaceHelpFormatterDeps, NamespaceSchemaHelpFormatter as BaseNamespaceSchemaHelpFormatter, NamespaceStringHelpFormatter as BaseNamespaceStringHelpFormatter, OptionGroup, formatOptionName, isOptionVisible } from '@ionic/cli-framework';
import { filter } from '@ionic/cli-framework/utils/array';

import { CommandMetadata, CommandMetadataInput, CommandMetadataOption, HydratedCommandMetadata, ICommand, INamespace } from '../definitions';

import { GLOBAL_OPTIONS } from './config';

const IONIC_LOGO = String.raw`
   _             _
  (_) ___  _ __ (_) ___
  | |/ _ \| '_ \| |/ __|
  | | (_) | | | | | (__
  |_|\___/|_| |_|_|\___|`;

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

  async getGlobalOptions(): Promise<string[]> {
    const visibleOptions = await filter(GLOBAL_OPTIONS, async opt => isOptionVisible(opt));
    return visibleOptions.map(opt => formatOptionName(opt, { colors: NO_COLORS, showAliases: false }));
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

  async formatBeforeOptionSummary(opt: CommandMetadataOption): Promise<string> {
    return (opt.hint ? `${opt.hint} ` : '') + await super.formatBeforeOptionSummary(opt);
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
