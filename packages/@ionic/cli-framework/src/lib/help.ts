import * as lodash from 'lodash';

import { CommandMetadata, CommandMetadataInput, CommandMetadataOption, HydratedCommandMetadata, HydratedNamespaceMetadata, ICommand, INamespace, NamespaceLocateResult, NamespaceMetadata } from '../definitions';
import { isHydratedCommandMetadata } from '../guards';

import { filter, map } from '../utils/array';
import { generateFillSpaceStringList, stringWidth, wordWrap } from '../utils/format';

import { Colors, DEFAULT_COLORS } from './colors';
import { validators } from './validators';

const DEFAULT_DOTS_WIDTH = 25;

export abstract class HelpFormatter {
  protected readonly colors: Colors;

  constructor({ colors }: { colors?: Colors; }) {
    this.colors = colors ? colors : DEFAULT_COLORS;
  }

  abstract format(): Promise<string>;
}

export interface NamespaceHelpFormatterDeps<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  readonly location: NamespaceLocateResult<C, N, M, I, O>;
  readonly namespace: N;
  readonly colors?: Colors;
}

export abstract class NamespaceHelpFormatter<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> extends HelpFormatter {
  protected readonly location: NamespaceLocateResult<C, N, M, I, O>;
  protected readonly namespace: N;
  protected readonly dotswidth: number = DEFAULT_DOTS_WIDTH;

  protected _metadata?: NamespaceMetadata;
  protected _fullName?: string;

  constructor({ location, namespace, colors }: NamespaceHelpFormatterDeps<C, N, M, I, O>) {
    super({ colors });
    this.location = location;
    this.namespace = namespace;
  }

  /**
   * Given command metadata, decide whether to keep or discard the command that
   * the metadata represents.
   *
   * @param meta: The metadata of the command.
   * @return `true` to keep, `false` to discard
   */
  filterCommandCallback?(meta: HydratedCommandMetadata<C, N, M, I, O>): Promise<boolean>;

  async getNamespaceMetadata(): Promise<NamespaceMetadata> {
    if (!this._metadata) {
      this._metadata = await this.namespace.getMetadata();
    }

    return this._metadata;
  }

  async getNamespaceFullName(): Promise<string> {
    if (!this._fullName) {
      this._fullName = this.location.path.map(([p]) => p).join(' ');
    }

    return this._fullName;
  }
}

export class NamespaceStringHelpFormatter<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> extends NamespaceHelpFormatter<C, N, M, I, O> {
  /**
   * Insert text that appears before a commands's summary.
   *
   * @param meta: The metadata of the command.
   */
  formatBeforeCommandSummary?(meta: HydratedCommandMetadata<C, N, M, I, O>): Promise<string>;

  /**
   * Insert text before summaries of listed subnamespaces.
   *
   * @param meta The metadata of the namespace.
   * @param commands An array of the metadata of the namespace's commands.
   */
  formatBeforeNamespaceSummary?(meta: HydratedNamespaceMetadata<C, N, M, I, O>, commands: ReadonlyArray<HydratedCommandMetadata<C, N, M, I, O>>): Promise<string>;

  /**
   * Insert text before the namespace's summary.
   */
  formatBeforeSummary?(): Promise<string>;

  /**
   * Insert text after the namespace's summary.
   */
  formatAfterSummary?(): Promise<string>;

  async formatHeader(): Promise<string> {
    const { strong, input } = this.colors;
    const fullName = await this.getNamespaceFullName();

    const summary = await this.formatSummary();
    const description = await this.formatDescription();

    return (
      `\n  ${strong(`${input(fullName)}${summary}`)}` +
      (description ? `\n\n    ${description}` : '') + '\n'
    );
  }

  async formatSummary(): Promise<string> {
    const fullName = await this.getNamespaceFullName();
    const metadata = await this.getNamespaceMetadata();
    const summary = (
      (this.formatBeforeSummary ? await this.formatBeforeSummary() : '') +
      metadata.summary +
      (this.formatAfterSummary ? await this.formatAfterSummary() : '')
    );

    const wrappedSummary = wordWrap(summary, { indentation: fullName.length + 5 });

    return wrappedSummary ? ` - ${wrappedSummary}` : '';
  }

  async formatDescription(): Promise<string> {
    const metadata = await this.getNamespaceMetadata();

    if (!metadata.description) {
      return '';
    }

    return wordWrap(metadata.description.trim(), { indentation: 4 });
  }

  async getExtraOptions(): Promise<string[]> {
    return [];
  }

  async formatUsage(): Promise<string> {
    const { strong, weak, input } = this.colors;
    const fullName = await this.getNamespaceFullName();

    const options = ['--help', ...(await this.getExtraOptions())];
    const usageLines = [
      `<command> ${weak('[<args>]')} ${options.map(opt => weak('[' + opt + ']')).join(' ')} ${weak('[options]')}`,
    ];

    return (
      `\n  ${strong('Usage')}:` +
      `\n\n    ${usageLines.map(u => `${weak('$')} ${input(fullName + ' ' + u)}`).join('\n    ')}\n`
    );
  }

  async formatCommands() {
    const commands = await this.namespace.getCommandMetadataList();

    return this.formatCommandGroup('Commands', commands);
  }

  async formatCommandGroup(title: string, commands: ReadonlyArray<HydratedCommandMetadata<C, N, M, I, O>>): Promise<string> {
    const { strong } = this.colors;

    const filterCallback = this.filterCommandCallback;
    const filteredCommands = filterCallback ? await filter(commands, async cmd => filterCallback(cmd)) : commands;

    const [ cmdDetails, nsDetails ] = await Promise.all([
      this.getListOfCommandDetails(filteredCommands.filter(cmd => cmd.namespace === this.namespace)),
      this.getListOfNamespaceDetails(filteredCommands.filter(cmd => cmd.namespace !== this.namespace)),
    ]);

    const details = [...cmdDetails, ...nsDetails];

    if (details.length === 0) {
      return '';
    }

    details.sort();

    return (
      `\n  ${strong(title)}:` +
      `\n\n    ${details.join('\n    ')}\n`
    );
  }

  async getListOfCommandDetails(commands: ReadonlyArray<HydratedCommandMetadata<C, N, M, I, O>>): Promise<string[]> {
    const { weak, input } = this.colors;
    const fullCmd = commands.map(cmd => lodash.tail(cmd.path).map(([p]) => p).join(' '));
    const fillStringArray = generateFillSpaceStringList(fullCmd, this.dotswidth, weak('.'));

    const formattedCommands = await Promise.all(commands.map(async (cmd, index) => {
      const summary = (
        (this.formatBeforeCommandSummary ? await this.formatBeforeCommandSummary(cmd) : '') +
        cmd.summary +
        (await this.formatAfterCommandSummary(cmd))
      );

      const wrappedSummary = wordWrap(summary, { indentation: this.dotswidth + 6 });
      return `${input(lodash.tail(cmd.path).map(([p]) => p).join(' '))}${wrappedSummary ? ' ' + fillStringArray[index] + ' ' + wrappedSummary : ''}`;
    }));

    return formattedCommands;
  }

  async getListOfNamespaceDetails(commands: ReadonlyArray<HydratedCommandMetadata<C, N, M, I, O>>): Promise<string[]> {
    const { weak, input } = this.colors;

    const namespaces = await this.namespace.groupCommandsByNamespace(commands);
    const fillStringArray = generateFillSpaceStringList(namespaces.map(({ name }) => name + ' <subcommand>'), this.dotswidth, weak('.'));

    const formattedNamespaces = await Promise.all(namespaces.map(async (meta, i) => {
      const summary = (
        (this.formatBeforeNamespaceSummary ? await this.formatBeforeNamespaceSummary(meta, meta.commands) : '') +
        meta.summary +
        (await this.formatAfterNamespaceSummary(meta, meta.commands))
      );

      const wrappedSummary = wordWrap(summary, { indentation: this.dotswidth + 6 });

      return `${input(meta.name + ' <subcommand>')}${wrappedSummary ? ' ' + fillStringArray[i] + ' ' + wrappedSummary : ''}`;
    }));

    return formattedNamespaces;
  }

  /**
   * Insert text that appears after a commands's summary.
   *
   * @param meta: The metadata of the command.
   */
  async formatAfterCommandSummary(meta: HydratedCommandMetadata<C, N, M, I, O>): Promise<string> {
    const { weak, input } = this.colors;

    const aliases = meta.aliases.map(alias => lodash.tail(alias.split(' ')).join(' '));
    const formattedAliases = aliases.length > 0 ? weak('(alias' + (aliases.length === 1 ? '' : 'es') + ': ') + aliases.map(a => input(a)).join(', ') + weak(')') : '';

    return formattedAliases ? ` ${formattedAliases}` : '';
  }

  /**
   * Insert text that appears after a namespace's summary.
   *
   * @param meta The metadata of the namespace.
   * @param commands An array of the metadata of the namespace's commands.
   */
  async formatAfterNamespaceSummary(meta: HydratedNamespaceMetadata<C, N, M, I, O>, commands: ReadonlyArray<HydratedCommandMetadata<C, N, M, I, O>>): Promise<string> {
    const { weak, input } = this.colors;

    const formattedSubcommands = commands.length > 0 ? `${weak('(subcommands:')} ${commands.map(c => input(c.name)).join(', ')}${weak(')')}` : '';
    const formattedAliases = meta.aliases.length > 0 ? `${weak('(alias' + (meta.aliases.length === 1 ? '' : 'es') + ': ') + meta.aliases.map(a => input(a)).join(', ') + weak(')')}` : '';

    return `${formattedSubcommands ? ` ${formattedSubcommands}` : ''}${formattedAliases ? ` ${formattedAliases}` : ''}`;
  }

  async format(): Promise<string> {
    return (
      (await this.formatHeader()) +
      (await this.formatUsage()) +
      (await this.formatCommands()) +
      '\n'
    );
  }
}

export interface CommandHelpFormatterDeps<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  readonly location: NamespaceLocateResult<C, N, M, I, O>;
  readonly command: C;

  /**
   * Provide extra context with hydrated command metadata. If not provided,
   * `command.getMetadata()` is called.
   */
  readonly metadata?: HydratedCommandMetadata<C, N, M, I, O>;
  readonly colors?: Colors;
}

export abstract class CommandHelpFormatter<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> extends HelpFormatter {
  protected readonly location: NamespaceLocateResult<C, N, M, I, O>;
  protected readonly command: C;
  protected readonly dotswidth: number = DEFAULT_DOTS_WIDTH;

  protected _metadata?: M;
  protected _hydratedMetadata?: HydratedCommandMetadata<C, N, M, I, O>;
  protected _fullName?: string;

  constructor({ location, command, metadata, colors }: CommandHelpFormatterDeps<C, N, M, I, O>) {
    super({ colors });
    this.location = location;
    this.command = command;
    this._hydratedMetadata = metadata;
  }

  /**
   * Given an option definition from command metadata, decide whether to keep
   * or discard it.
   *
   * @return `true` to keep, `false` to discard
   */
  filterOptionCallback?(option: O): Promise<boolean>;

  async getCommandMetadata(): Promise<M | HydratedCommandMetadata<C, N, M, I, O>> {
    if (this._hydratedMetadata) {
      return this._hydratedMetadata;
    }

    if (!this._metadata) {
      this._metadata = await this.command.getMetadata({ location: this.location });
    }

    return this._metadata;
  }

  async getCommandFullName(): Promise<string> {
    if (!this._fullName) {
      this._fullName = this.location.path.map(([p]) => p).join(' ');
    }

    return this._fullName;
  }
}

export class CommandStringHelpFormatter<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> extends CommandHelpFormatter<C, N, M, I, O> {
  /**
   * Insert text that appears before an option's summary.
   *
   * @param opt The metadata of the option.
   */
  formatBeforeOptionSummary?(opt: O): Promise<string>;

  /**
   * Insert text before the command's summary.
   */
  formatBeforeSummary?(): Promise<string>;

  /**
   * Insert text after the command's summary.
   */
  formatAfterSummary?(): Promise<string>;

  async formatHeader(): Promise<string> {
    const { strong, input } = this.colors;
    const fullName = await this.getCommandFullName();

    const summary = await this.formatSummary();
    const description = await this.formatDescription();

    return (
      `\n  ${strong(`${input(fullName)}${summary}`)}` +
      (description ? `\n\n    ${description}` : '') + '\n'
    );
  }

  async formatSummary(): Promise<string> {
    const fullName = await this.getCommandFullName();
    const metadata = await this.getCommandMetadata();

    const summary = (
      (this.formatBeforeSummary ? await this.formatBeforeSummary() : '') +
      metadata.summary +
      (this.formatAfterSummary ? await this.formatAfterSummary() : '')
    );

    const wrappedSummary = wordWrap(summary, { indentation: fullName.length + 5 });

    return wrappedSummary ? ` - ${wrappedSummary}` : '';
  }

  async formatDescription(): Promise<string> {
    const metadata = await this.getCommandMetadata();

    if (!metadata.description) {
      return '';
    }

    return wordWrap(metadata.description.trim(), { indentation: 4 });
  }

  async formatInlineInput(input: I): Promise<string> {
    if (input.validators && input.validators.includes(validators.required)) {
      return '<' + input.name + '>';
    }

    return '[<' + input.name + '>]';
  }

  async formatUsage(): Promise<string> {
    const { strong, weak, input } = this.colors;
    const fullName = await this.getCommandFullName();
    const metadata = await this.getCommandMetadata();

    const filterCallback = this.filterOptionCallback;
    const options = metadata.options ? metadata.options : [];
    const filteredOptions = filterCallback ? await filter(options, async opt => filterCallback(opt)) : options;
    const formattedInputs = metadata.inputs ? await Promise.all(metadata.inputs.map(async input => this.formatInlineInput(input))) : [];

    return (
      `\n  ${strong('Usage')}:` +
      `\n\n    ${weak('$')} ${input(fullName + (formattedInputs ? ' ' + formattedInputs.join(' ') : ''))}${filteredOptions.length > 0 ? ' ' + input('[options]') : ''}\n`
    );
  }

  async formatInputs(): Promise<string> {
    const { strong, weak, input } = this.colors;
    const metadata = await this.getCommandMetadata();
    const inputs = metadata.inputs ? metadata.inputs : [];

    if (inputs.length === 0) {
      return '';
    }

    const fillStrings = generateFillSpaceStringList(inputs.map(input => input.name), this.dotswidth, weak('.'));

    const inputLineFn = ({ name, summary }: I, index: number) => {
      const optionList = input(`${name}`);
      const wrappedSummary = wordWrap(summary, { indentation: this.dotswidth + 6 });

      return `${optionList} ${fillStrings[index]} ${wrappedSummary}`;
    };

    return (
      `\n  ${strong('Inputs')}:` +
      `\n\n    ${inputs.map(inputLineFn).join('\n    ')}\n`
    );
  }

  async formatOptionLine(opt: O) {
    const { weak, input } = this.colors;
    const showInverse = opt.type === Boolean && opt.default === true && opt.name.length > 1;
    const optionList = (showInverse ? input(`--no-${opt.name}`) : input(`-${opt.name.length > 1 ? '-' : ''}${opt.name}`)) +
      (!showInverse && opt.aliases && opt.aliases.length > 0 ? ', ' +
        opt.aliases
        .map(alias => input(`-${alias}`))
        .join(', ') : '');

    const optionListLength = stringWidth(optionList);
    const fullLength = optionListLength > this.dotswidth ? optionListLength + 1 : this.dotswidth;
    const fullDescription = (
      (this.formatBeforeOptionSummary ? await this.formatBeforeOptionSummary(opt) : '') +
      opt.summary +
      (await this.formatAfterOptionSummary(opt))
    );

    const wrappedDescription = wordWrap(fullDescription, { indentation: this.dotswidth + 6 });

    return `${optionList} ${weak('.').repeat(fullLength - optionListLength)} ${wrappedDescription}`;
  }

  async formatAfterOptionSummary(opt: O): Promise<string> {
    return this.formatOptionDefault(opt);
  }

  async formatOptionDefault(opt: O): Promise<string> {
    const { weak, input } = this.colors;

    if (typeof opt.default === 'string') {
      return weak(' (default: ') + input(opt.default) + weak(')');
    } else {
      return '';
    }
  }

  async formatOptions(): Promise<string> {
    const metadata = await this.getCommandMetadata();
    const options = metadata.options ? metadata.options : [];

    return this.formatOptionsGroup('Options', options);
  }

  async formatOptionsGroup(title: string, options: O[]): Promise<string> {
    const { strong } = this.colors;

    const filterCallback = this.filterOptionCallback;
    const filteredOptions = filterCallback ? await filter(options, async opt => filterCallback(opt)) : options;

    if (filteredOptions.length === 0) {
      return '';
    }

    const formattedOptions = await Promise.all(filteredOptions.map(async option => this.formatOptionLine(option)));

    return (
      `\n  ${strong(title)}:` +
      `\n\n    ${formattedOptions.join('\n    ')}\n`
    );
  }

  async formatExamples(): Promise<string> {
    const { strong, weak, input } = this.colors;
    const metadata = await this.getCommandMetadata();
    const fullName = await this.getCommandFullName();

    if (!metadata.exampleCommands || !Array.isArray(metadata.exampleCommands)) {
      return '';
    }

    const exampleLines = metadata.exampleCommands.map(cmd => {
      const sepIndex = cmd.indexOf(' -- ');
      cmd = sepIndex === -1 ? input(cmd) : input(cmd.substring(0, sepIndex)) + cmd.substring(sepIndex);
      const wrappedCmd = wordWrap(cmd, { indentation: 12, append: ' \\' });

      return `${weak('$')} ${input(fullName)}${wrappedCmd ? ' ' + wrappedCmd : ''}`;
    });

    return (
      `\n  ${strong('Examples')}:` +
      `\n\n    ${exampleLines.join('\n    ')}\n`
    );
  }

  async format(): Promise<string> {
    return (
      (await this.formatHeader()) +
      (await this.formatUsage()) +
      (await this.formatInputs()) +
      (await this.formatOptions()) +
      (await this.formatExamples()) +
      '\n'
    );
  }
}

export interface NamespaceHelpSchema {
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly groups: ReadonlyArray<string>;
  readonly commands: CommandHelpSchema[];
  readonly aliases: ReadonlyArray<string>;
}

export class NamespaceSchemaHelpFormatter<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> extends NamespaceHelpFormatter<C, N, M, I, O> {
  async format(): Promise<string> {
    return JSON.stringify(await this.serialize());
  }

  async serialize(): Promise<NamespaceHelpSchema> {
    const metadata = await this.getNamespaceMetadata();
    const commands = await this.namespace.getCommandMetadataList();

    return {
      name: metadata.name,
      summary: metadata.summary,
      description: metadata.description ? metadata.description : '',
      groups: metadata.groups ? metadata.groups : [],
      commands: await this.formatCommandGroup(commands),
      aliases: [],
    };
  }

  async formatCommandGroup(commands: ReadonlyArray<HydratedCommandMetadata<C, N, M, I, O>>): Promise<CommandHelpSchema[]> {
    const filterCallback = this.filterCommandCallback;
    const filteredCommands = filterCallback ? await filter(commands, async cmd => filterCallback(cmd)) : commands;

    return map(filteredCommands, async cmd => this.formatCommand(cmd));
  }

  async formatCommand(cmd: HydratedCommandMetadata<C, N, M, I, O>): Promise<CommandHelpSchema> {
    const { command } = cmd;

    const formatter = new CommandSchemaHelpFormatter({
      location: { path: [...cmd.path], obj: command, args: [] },
      command,
      metadata: cmd,
    });

    return formatter.serialize();
  }
}

export interface CommandHelpSchemaInput {
  readonly name: string;
  readonly summary: string;
  readonly required: boolean;
}

export interface CommandHelpSchemaOption {
  readonly name: string;
  readonly summary: string;
  readonly groups: ReadonlyArray<string>;
  readonly aliases: ReadonlyArray<string>;
  readonly type: string;
  readonly default?: string | boolean;
}

export interface CommandHelpSchema {
  readonly name: string;
  readonly namespace: ReadonlyArray<string>;
  readonly summary: string;
  readonly description: string;
  readonly groups: ReadonlyArray<string>;
  readonly exampleCommands: ReadonlyArray<string>;
  readonly aliases: ReadonlyArray<string>;
  readonly inputs: ReadonlyArray<CommandHelpSchemaInput>;
  readonly options: ReadonlyArray<CommandHelpSchemaOption>;
}

export class CommandSchemaHelpFormatter<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> extends CommandHelpFormatter<C, N, M, I, O> {
  async format(): Promise<string> {
    return JSON.stringify(await this.serialize());
  }

  async serialize(): Promise<CommandHelpSchema> {
    const metadata = await this.getCommandMetadata();

    return this.formatCommand(metadata);
  }

  async formatInputs(inputs: ReadonlyArray<I>): Promise<ReadonlyArray<CommandHelpSchemaInput>> {
    return Promise.all(inputs.map(async input => this.formatInput(input)));
  }

  async formatInput(input: I): Promise<CommandHelpSchemaInput> {
    const name = input.name;
    const summary = input.summary;
    const required = input.validators && input.validators.includes(validators.required) ? true : false;

    return { name, summary, required };
  }

  async formatOptions(options: ReadonlyArray<O>): Promise<ReadonlyArray<CommandHelpSchemaOption>> {
    const filterCallback = this.filterOptionCallback;
    const filteredOptions = filterCallback ? await filter(options, async opt => filterCallback(opt)) : options;

    return Promise.all(filteredOptions.map(async opt => this.formatOption(opt)));
  }

  async formatOption(option: O): Promise<CommandHelpSchemaOption> {
    const name = option.name;
    const summary = option.summary ? option.summary.trim() : '';
    const groups = option.groups ? option.groups : [];
    const aliases = option.aliases ? option.aliases : [];
    const type = option.type ? option.type.name.toLowerCase() : 'string';

    return { name, type, summary, default: option.default, groups, aliases };
  }

  async formatCommand(cmd: M | HydratedCommandMetadata<C, N, M, I, O>): Promise<CommandHelpSchema> {
    const commandPath = this.location.path.map(([p]) => p);
    const namespacePath = lodash.initial(commandPath);
    const name = commandPath.join(' ');
    const summary = cmd.summary ? cmd.summary.trim() : '';
    const description = cmd.description ? cmd.description.trim() : '';
    const groups = cmd.groups ? cmd.groups : [];
    const exampleCommands = cmd.exampleCommands ? cmd.exampleCommands.map(c => `${name} ${c}`) : [];
    const aliases = isHydratedCommandMetadata(cmd) ? cmd.aliases : [];
    const inputs = cmd.inputs ? await this.formatInputs(cmd.inputs) : [];
    const options = cmd.options ? await this.formatOptions(cmd.options) : [];

    return { name, namespace: namespacePath, summary, description, groups, exampleCommands, aliases, inputs, options };
  }
}
