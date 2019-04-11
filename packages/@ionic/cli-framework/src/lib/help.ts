import { filter, map } from '@ionic/utils-array';
import * as Debug from 'debug';
import * as lodash from 'lodash';

import { CommandMetadata, CommandMetadataInput, CommandMetadataOption, Footnote, HydratedCommandMetadata, HydratedNamespaceMetadata, ICommand, INamespace, LinkFootnote, MetadataGroup, NamespaceLocateResult, NamespaceMetadata } from '../definitions';
import { isHydratedCommandMetadata, isLinkFootnote } from '../guards';
import { generateFillSpaceStringList, stringWidth, wordWrap } from '../utils/format';

import { ColorFunction, Colors, DEFAULT_COLORS } from './colors';
import { formatOptionName, hydrateOptionSpec } from './options';
import { validators } from './validators';

const debug = Debug('ionic:cli-framework:lib:help');

const DEFAULT_DOTS_WIDTH = 32;

function formatHelpGroups(groups: string[] = [], colors: Colors = DEFAULT_COLORS): string {
  const { help: { group: gcolors } } = colors;

  return groups
    .map(g => g in gcolors ? gcolors[g as keyof typeof gcolors](`(${g})`) + ' ' : '')
    .join('');
}

function formatLinkFootnote(footnote: LinkFootnote, colors: Colors = DEFAULT_COLORS): string {
  const { strong } = colors;

  return strong(footnote.shortUrl ? footnote.shortUrl : footnote.url);
}

function formatFootnote(index: number, footnote: Footnote, colors: Colors = DEFAULT_COLORS): string {
  const { ancillary } = colors;
  const prefix = ancillary(`[${index}]`);

  const output = isLinkFootnote(footnote) ? formatLinkFootnote(footnote, colors) : footnote.text;

  return `${prefix}: ${output}`;
}

function formatFootnotes(text: string, footnotes?: ReadonlyArray<Footnote>, colors: Colors = DEFAULT_COLORS): string {
  if (!footnotes) {
    return text;
  }

  const { ancillary } = colors;
  const discoveredFootnotes: Footnote[] = [];
  const output = text.replace(/\[\^([A-z0-9-]+)\]/g, (match, p1) => {
    const m = Number.parseInt(p1, 10);
    const id = !Number.isNaN(m) ? m : p1;
    const foundFootnote = footnotes.find(footnote => footnote.id === id);

    if (foundFootnote) {
      const len = discoveredFootnotes.push(foundFootnote);
      return ancillary(`[${len}]`);
    } else {
      debug('No footnote found by ID: %O', id);
      return '';
    }
  });

  return output + (
    discoveredFootnotes.length > 0 ?
      `\n\n${discoveredFootnotes.map((footnote, i) => formatFootnote(i + 1, footnote, colors)).join('\n')}` :
      ''
  );
}

export async function isOptionVisible<O extends CommandMetadataOption>(opt: O): Promise<boolean> {
  return !opt.groups || !opt.groups.includes(MetadataGroup.HIDDEN);
}

export async function isCommandVisible<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption>(cmd: HydratedCommandMetadata<C, N, M, I, O>): Promise<boolean> {
  const ns = await cmd.namespace.getMetadata();
  return (!cmd.groups || !cmd.groups.includes(MetadataGroup.HIDDEN)) && (!ns.groups || !ns.groups.includes(MetadataGroup.HIDDEN));
}

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
  async filterCommandCallback(meta: HydratedCommandMetadata<C, N, M, I, O>): Promise<boolean> {
    return isCommandVisible(meta);
  }

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
      (await this.formatBeforeSummary(metadata)) +
      metadata.summary +
      (await this.formatAfterSummary(metadata))
    );

    const wrappedSummary = wordWrap(summary, { indentation: fullName.length + 5 });

    return wrappedSummary ? ` - ${wrappedSummary}` : '';
  }

  async formatDescription(): Promise<string> {
    const metadata = await this.getNamespaceMetadata();

    if (!metadata.description) {
      return '';
    }

    const text = formatFootnotes(metadata.description.trim(), metadata.footnotes, this.colors);

    return wordWrap(text, { indentation: 4 });
  }

  async getGlobalOptions(): Promise<string[]> {
    return [];
  }

  async formatUsage(): Promise<string> {
    const { help: { title }, weak, input } = this.colors;
    const fullName = await this.getNamespaceFullName();

    const options = ['--help', ...(await this.getGlobalOptions())];
    const usageLines = [
      `<command> ${weak('[<args>]')} ${options.map(opt => weak('[' + opt + ']')).join(' ')} ${weak('[options]')}`,
    ];

    return (
      `\n  ${title('Usage')}:` +
      `\n\n    ${usageLines.map(u => `${weak('$')} ${input(fullName + ' ' + u)}`).join('\n    ')}\n`
    );
  }

  async formatCommands() {
    const commands = await this.namespace.getCommandMetadataList();

    return this.formatCommandGroup('Commands', commands);
  }

  async formatCommandGroup(titleText: string, commands: ReadonlyArray<HydratedCommandMetadata<C, N, M, I, O>>): Promise<string> {
    const { help: { title } } = this.colors;

    const filteredCommands = await filter(commands, async cmd => this.filterCommandCallback(cmd));

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
      `\n  ${title(titleText)}:` +
      `\n\n    ${details.join('\n    ')}\n`
    );
  }

  async getListOfCommandDetails(commands: ReadonlyArray<HydratedCommandMetadata<C, N, M, I, O>>): Promise<string[]> {
    const { weak, input } = this.colors;
    const fullCmd = commands.map(cmd => lodash.tail(cmd.path).map(([p]) => p).join(' '));
    const fillStringArray = generateFillSpaceStringList(fullCmd, this.dotswidth, weak('.'));

    const formattedCommands = await Promise.all(commands.map(async (cmd, index) => {
      const wrapColor: ColorFunction = cmd.groups && cmd.groups.includes(MetadataGroup.DEPRECATED) ? weak : lodash.identity;

      const summary = (
        (await this.formatBeforeCommandSummary(cmd)) +
        cmd.summary +
        (await this.formatAfterCommandSummary(cmd))
      );

      const wrappedSummary = wordWrap(summary, { indentation: this.dotswidth + 6 });
      const line = `${input(lodash.tail(cmd.path).map(([p]) => p).join(' '))}${wrappedSummary ? ' ' + fillStringArray[index] + ' ' + wrappedSummary : ''}`;

      return wrapColor(line);
    }));

    return formattedCommands;
  }

  async getListOfNamespaceDetails(commands: ReadonlyArray<HydratedCommandMetadata<C, N, M, I, O>>): Promise<string[]> {
    const { weak, input } = this.colors;

    const namespaces = await this.namespace.groupCommandsByNamespace(commands);
    const fillStringArray = generateFillSpaceStringList(namespaces.map(({ name }) => name + ' <subcommand>'), this.dotswidth, weak('.'));

    const formattedNamespaces = await Promise.all(namespaces.map(async (meta, i) => {
      const summary = (
        (await this.formatBeforeNamespaceSummary(meta, meta.commands)) +
        meta.summary +
        (await this.formatAfterNamespaceSummary(meta, meta.commands))
      );

      const wrappedSummary = wordWrap(summary, { indentation: this.dotswidth + 6 });

      return `${input(meta.name + ' <subcommand>')}${wrappedSummary ? ' ' + fillStringArray[i] + ' ' + wrappedSummary : ''}`;
    }));

    return formattedNamespaces;
  }

  /**
   * Insert text before the namespace's summary.
   *
   * @param meta: The metadata of the namespace.
   */
  async formatBeforeSummary(meta: NamespaceMetadata): Promise<string> {
    return formatHelpGroups(meta.groups, this.colors);
  }

  /**
   * Insert text after the namespace's summary.
   *
   * @param meta: The metadata of the namespace.
   */
  async formatAfterSummary(meta: NamespaceMetadata): Promise<string> {
    return '';
  }

  /**
   * Insert text that appears before a commands's summary.
   *
   * @param meta: The metadata of the command.
   */
  async formatBeforeCommandSummary(meta: HydratedCommandMetadata<C, N, M, I, O>): Promise<string> {
    return formatHelpGroups(meta.groups, this.colors);
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
   * Insert text that appears before a namespace's summary.
   *
   * @param meta The metadata of the namespace.
   * @param commands An array of the metadata of the namespace's commands.
   */
  async formatBeforeNamespaceSummary(meta: HydratedNamespaceMetadata<C, N, M, I, O>, commands: ReadonlyArray<HydratedCommandMetadata<C, N, M, I, O>>): Promise<string> {
    return formatHelpGroups(meta.groups, this.colors);
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
  async filterOptionCallback(option: O): Promise<boolean> {
    return isOptionVisible(option);
  }

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
      (await this.formatBeforeSummary(metadata)) +
      metadata.summary +
      (await this.formatAfterSummary(metadata))
    );

    const wrappedSummary = wordWrap(summary, { indentation: fullName.length + 5 });

    return wrappedSummary ? ` - ${wrappedSummary}` : '';
  }

  async formatDescription(): Promise<string> {
    const metadata = await this.getCommandMetadata();

    if (!metadata.description) {
      return '';
    }

    const text = formatFootnotes(metadata.description.trim(), metadata.footnotes, this.colors);

    return wordWrap(text, { indentation: 4 });
  }

  async formatInlineInput(input: I): Promise<string> {
    if (input.validators && input.validators.includes(validators.required)) {
      return '<' + input.name + '>';
    }

    return '[<' + input.name + '>]';
  }

  async formatUsage(): Promise<string> {
    const { help: { title }, weak, input } = this.colors;
    const fullName = await this.getCommandFullName();
    const metadata = await this.getCommandMetadata();

    const options = metadata.options ? metadata.options : [];
    const filteredOptions = await filter(options, async opt => this.filterOptionCallback(opt));
    const formattedInputs = metadata.inputs ? await Promise.all(metadata.inputs.map(async i => this.formatInlineInput(i))) : [];

    return (
      `\n  ${title('Usage')}:` +
      `\n\n    ${weak('$')} ${input(fullName + (formattedInputs.length > 0 ? ' ' + formattedInputs.join(' ') : ''))}${filteredOptions.length > 0 ? ' ' + input('[options]') : ''}\n`
    );
  }

  async formatInputs(): Promise<string> {
    const { help: { title }, weak, input } = this.colors;
    const metadata = await this.getCommandMetadata();
    const inputs = metadata.inputs ? metadata.inputs : [];

    if (inputs.length === 0) {
      return '';
    }

    const fillStrings = generateFillSpaceStringList(inputs.map(i => i.name), this.dotswidth, weak('.'));

    const inputLineFn = ({ name, summary }: I, index: number) => {
      const optionList = input(`${name}`);
      const wrappedSummary = wordWrap(summary, { indentation: this.dotswidth + 6 });

      return `${optionList} ${fillStrings[index]} ${wrappedSummary}`;
    };

    return (
      `\n  ${title('Inputs')}:` +
      `\n\n    ${inputs.map(inputLineFn).join('\n    ')}\n`
    );
  }

  async formatOptionLine(opt: O) {
    const { weak } = this.colors;
    const wrapColor: ColorFunction = opt.groups && opt.groups.includes(MetadataGroup.DEPRECATED) ? weak : lodash.identity;
    const optionName = formatOptionName(opt, { colors: this.colors });
    const optionNameLength = stringWidth(optionName);
    const fullLength = optionNameLength > this.dotswidth ? optionNameLength + 1 : this.dotswidth;
    const fullDescription = (
      (await this.formatBeforeOptionSummary(opt)) +
      opt.summary +
      (await this.formatAfterOptionSummary(opt))
    );

    const wrappedDescription = wordWrap(fullDescription, { indentation: this.dotswidth + 6 });
    const line = `${optionName} ${weak('.').repeat(fullLength - optionNameLength)} ${wrappedDescription}`;

    return wrapColor(line);
  }

  /**
   * Insert text before the command's summary.
   *
   * @param meta The metadata of the command.
   */
  async formatBeforeSummary(meta: M): Promise<string> {
    return formatHelpGroups(meta.groups, this.colors);
  }

  /**
   * Insert text after the command's summary.
   *
   * @param meta The metadata of the command.
   */
  async formatAfterSummary(meta: M): Promise<string> {
    return '';
  }

  /**
   * Insert text that appears before an option's summary.
   *
   * @param opt The metadata of the option.
   */
  async formatBeforeOptionSummary(opt: O): Promise<string> {
    return formatHelpGroups(opt.groups, this.colors);
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

  async formatOptionsGroup(titleText: string, options: O[]): Promise<string> {
    const { help: { title } } = this.colors;

    const filteredOptions = await filter(options, async opt => this.filterOptionCallback(opt));

    if (filteredOptions.length === 0) {
      return '';
    }

    const formattedOptions = await Promise.all(filteredOptions.map(async option => this.formatOptionLine(option)));

    return (
      `\n  ${title(titleText)}:` +
      `\n\n    ${formattedOptions.join('\n    ')}\n`
    );
  }

  async formatExamples(): Promise<string> {
    const { help: { title }, weak, input } = this.colors;
    const metadata = await this.getCommandMetadata();
    const fullName = await this.getCommandFullName();

    if (!metadata.exampleCommands || !Array.isArray(metadata.exampleCommands)) {
      return '';
    }

    const exampleLines = metadata.exampleCommands.map(cmd => {
      const sepIndex = cmd.indexOf(' -- ');
      cmd = sepIndex === -1 ? input(cmd) : input(cmd.substring(0, sepIndex)) + cmd.substring(sepIndex);
      const wrappedCmd = wordWrap(cmd, { indentation: 12, append: '\\' });

      return `${weak('$')} ${input(fullName + ' ')}${wrappedCmd ? wrappedCmd : ''}`;
    });

    return (
      `\n  ${title('Examples')}:` +
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
    const filteredCommands = await filter(commands, async cmd => this.filterCommandCallback(cmd));

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
  readonly spec: {
    readonly value: string;
  };
}

export interface CommandHelpSchemaFootnoteText {
  readonly type: 'text';
  readonly id: string | number;
  readonly text: string;
}

export interface CommandHelpSchemaFootnoteLink {
  readonly type: 'link';
  readonly id: string | number;
  readonly url: string;
  readonly shortUrl?: string;
}

export type CommandHelpSchemaFootnote = CommandHelpSchemaFootnoteText | CommandHelpSchemaFootnoteLink;

export interface CommandHelpSchema {
  readonly name: string;
  readonly namespace: ReadonlyArray<string>;
  readonly summary: string;
  readonly description: string;
  readonly footnotes: ReadonlyArray<CommandHelpSchemaFootnote>;
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
    const filteredOptions = await filter(options, async opt => this.filterOptionCallback(opt));

    return Promise.all(filteredOptions.map(async opt => this.formatOption(opt)));
  }

  async formatOption(option: O): Promise<CommandHelpSchemaOption> {
    const name = option.name;
    const summary = option.summary ? option.summary.trim() : '';
    const groups = option.groups ? option.groups : [];
    const aliases = option.aliases ? option.aliases : [];
    const type = option.type ? option.type.name.toLowerCase() : 'string';
    const spec = hydrateOptionSpec(option);

    return { name, type, summary, default: option.default, groups, aliases, spec };
  }

  formatFootnote(footnote: Footnote): CommandHelpSchemaFootnote {
    return isLinkFootnote(footnote) ? ({ type: 'link', ...footnote }) : ({ type: 'text', ...footnote });
  }

  async formatCommand(cmd: M | HydratedCommandMetadata<C, N, M, I, O>): Promise<CommandHelpSchema> {
    const commandPath = this.location.path.map(([p]) => p);
    const namespacePath = lodash.initial(commandPath);
    const name = commandPath.join(' ');
    const summary = cmd.summary ? cmd.summary.trim() : '';
    const description = cmd.description ? cmd.description.trim() : '';
    const footnotes = cmd.footnotes ? cmd.footnotes.map(footnote => this.formatFootnote(footnote)) : [];
    const groups = cmd.groups ? cmd.groups : [];
    const exampleCommands = cmd.exampleCommands ? cmd.exampleCommands.map(c => `${name} ${c}`) : [];
    const aliases = isHydratedCommandMetadata(cmd) ? cmd.aliases : [];
    const inputs = cmd.inputs ? await this.formatInputs(cmd.inputs) : [];
    const options = cmd.options ? await this.formatOptions(cmd.options) : [];

    return { name, namespace: namespacePath, summary, description, footnotes, groups, exampleCommands, aliases, inputs, options };
  }
}

export function createCommandMetadataFromSchema(schema: CommandHelpSchema): Required<CommandMetadata> {
  return {
    name: schema.name,
    summary: schema.summary,
    description: schema.description,
    footnotes: [...schema.footnotes],
    groups: [...schema.groups],
    exampleCommands: [...schema.exampleCommands],
    inputs: [...schema.inputs],
    options: schema.options.map(opt => ({ ...opt, type: opt.type === 'boolean' ? Boolean : String, groups: [...opt.groups], aliases: [...opt.aliases] })),
  };
}
