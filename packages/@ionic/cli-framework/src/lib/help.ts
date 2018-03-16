import {
  Colors,
  CommandMetadata,
  CommandMetadataInput,
  CommandMetadataOption,
  HydratedCommandMetadata,
  ICommand,
  INamespace,
  NamespaceLocateResultantCommand,
  NamespaceLocateResultantNamespace,
  NamespaceMetadata,
} from '../definitions';

import { filter } from '../utils/array';
import { generateFillSpaceStringList, stringWidth, wordWrap } from '../utils/format';

import { DEFAULT_COLORS } from './colors';
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
  readonly location: NamespaceLocateResultantNamespace<C, N, M, I, O>;
  readonly colors?: Colors;
}

export class NamespaceHelpFormatter<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> extends HelpFormatter {
  protected readonly location: NamespaceLocateResultantNamespace<C, N, M, I, O>;
  protected readonly namespace: N;
  protected readonly dotswidth: number = DEFAULT_DOTS_WIDTH;

  protected _metadata: NamespaceMetadata;
  protected _fullName: string;

  constructor({ location, colors }: NamespaceHelpFormatterDeps<C, N, M, I, O>) {
    super({ colors });
    this.location = location;
    this.namespace = location.obj;
  }

  filterCommandCallback?(cmd: M & HydratedCommandMetadata<C, N, M, I, O>): Promise<boolean>;

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

  async formatHeader(): Promise<string> {
    const { strong, input } = this.colors;
    const fullName = await this.getNamespaceFullName();

    const description = await this.formatDescription();
    const longDescription = await this.formatLongDescription();

    return (
      `\n  ${strong(`${input(fullName)}${description}`)}` +
      (longDescription ? `\n\n    ${longDescription}` : '') + '\n'
    );
  }

  async formatDescription(): Promise<string> {
    const fullName = await this.getNamespaceFullName();
    const metadata = await this.getNamespaceMetadata();
    const wrappedDescription = wordWrap(metadata.description, { indentation: fullName.length + 5 });
    const subtitle = await this.formatSubtitle();
    const description = (subtitle ? subtitle + ' ' : '') + wrappedDescription;

    return description ? ` - ${description}` : '';
  }

  async formatSubtitle(): Promise<string> {
    return '';
  }

  async formatLongDescription(): Promise<string> {
    const metadata = await this.getNamespaceMetadata();

    if (!metadata.longDescription) {
      return '';
    }

    return wordWrap(metadata.longDescription.trim(), { indentation: 4 });
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

  async formatCommandGroup(title: string, commands: ReadonlyArray<M & HydratedCommandMetadata<C, N, M, I, O>>): Promise<string> {
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

  async getListOfCommandDetails(commands: ReadonlyArray<M & HydratedCommandMetadata<C, N, M, I, O>>): Promise<string[]> {
    const { weak, input } = this.colors;
    const fullCmd = commands.map(cmd => cmd.path.map(([p]) => p).join(' '));
    const fillStringArray = generateFillSpaceStringList(fullCmd, this.dotswidth, weak('.'));

    const formattedCommands = await Promise.all(commands.map(async (cmd, index) => {
      const description = (await this.formatBeforeCommandDescription(cmd)) + cmd.description + (await this.formatAfterCommandDescription(cmd));
      const wrappedDescription = wordWrap(description, { indentation: this.dotswidth + 6 });
      return `${input(cmd.path.map(p => p[0]).join(' '))} ${fillStringArray[index]} ${wrappedDescription}`;
    }));

    return formattedCommands;
  }

  async getListOfNamespaceDetails(commands: ReadonlyArray<M & HydratedCommandMetadata<C, N, M, I, O>>): Promise<string[]> {
    const { weak, input } = this.colors;
    const descriptions = new Map<string, string>();
    const grouped = new Map<string, { meta: NamespaceMetadata; cmds: (M & HydratedCommandMetadata<C, N, M, I, O>)[]; }>();

    await Promise.all(commands.map(async cmd => {
      const nsmeta = await cmd.namespace.getMetadata();
      descriptions.set(nsmeta.name, nsmeta.description);
      let entry = grouped.get(nsmeta.name);

      if (!entry) {
        entry = { meta: nsmeta, cmds: [] };
        grouped.set(nsmeta.name, entry);
      }

      entry.cmds.push(cmd);
    }));

    const entries = [...grouped.entries()];
    const fillStringArray = generateFillSpaceStringList(entries.map(([name]) => name + ' <subcommand>'), this.dotswidth, weak('.'));

    const formattedNamespaces = await Promise.all(entries.map(async ([name, { meta, cmds }], i) => {
      const subcommands = cmds.map(c => input(c.name)).join(', ');
      const wrappedDescription = wordWrap(`${await this.formatBeforeNamespaceDescription(meta)}${descriptions.get(name)} ${weak('(subcommands:')} ${subcommands}${weak(')')}`, { indentation: this.dotswidth + 6 });
      return `${input(name + ' <subcommand>')} ${fillStringArray[i]} ${wrappedDescription}`;
    }));

    return formattedNamespaces;
  }

  async formatBeforeNamespaceDescription(meta: NamespaceMetadata): Promise<string> {
    return '';
  }

  async formatBeforeCommandDescription(cmd: M & HydratedCommandMetadata<C, N, M, I, O>): Promise<string> {
    return '';
  }

  async formatAfterCommandDescription(cmd: M & HydratedCommandMetadata<C, N, M, I, O>): Promise<string> {
    const { weak, input } = this.colors;
    return `${cmd.aliases.length > 0 ? weak(' (alias' + (cmd.aliases.length === 1 ? '' : 'es') + ': ') + cmd.aliases.map(a => input(a)).join(', ') + weak(')') : ''}`;
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
  readonly location: NamespaceLocateResultantCommand<C, N, M, I, O>;
  readonly colors?: Colors;
}

export class CommandHelpFormatter<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> extends HelpFormatter {
  protected readonly location: NamespaceLocateResultantCommand<C, N, M, I, O>;
  protected readonly command: C;
  protected readonly dotswidth: number = DEFAULT_DOTS_WIDTH;

  protected _metadata: M;
  protected _fullName: string;

  constructor({ location, colors }: CommandHelpFormatterDeps<C, N, M, I, O>) {
    super({ colors });
    this.location = location;
    this.command = location.obj;
  }

  async getCommandMetadata(): Promise<M> {
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

  filterOptionCallback(options: O): boolean {
    return true;
  }

  async formatHeader(): Promise<string> {
    const { strong, input } = this.colors;
    const fullName = await this.getCommandFullName();

    const description = await this.formatDescription();
    const longDescription = await this.formatLongDescription();

    return (
      `\n  ${strong(`${input(fullName)}${description}`)}` +
      (longDescription ? `\n\n    ${longDescription}` : '') + '\n'
    );
  }

  async formatDescription(): Promise<string> {
    const fullName = await this.getCommandFullName();
    const metadata = await this.getCommandMetadata();
    const wrappedDescription = wordWrap(metadata.description, { indentation: fullName.length + 5 });
    const subtitle = await this.formatSubtitle();
    const description = (subtitle ? subtitle + ' ' : '') + wrappedDescription;

    return description ? ` - ${description}` : '';
  }

  async formatSubtitle(): Promise<string> {
    return '';
  }

  async formatLongDescription(): Promise<string> {
    const metadata = await this.getCommandMetadata();

    if (!metadata.longDescription) {
      return '';
    }

    return wordWrap(metadata.longDescription.trim(), { indentation: 4 });
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

    const options = metadata.options ? metadata.options.filter(opt => this.filterOptionCallback(opt)) : [];
    const formattedInputs = metadata.inputs ? await Promise.all(metadata.inputs.map(async input => this.formatInlineInput(input))) : [];

    return (
      `\n  ${strong('Usage')}:` +
      `\n\n    ${weak('$')} ${input(fullName + (formattedInputs ? ' ' + formattedInputs.join(' ') : ''))}${options.length > 0 ? ' ' + input('[options]') : ''}\n`
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

    const inputLineFn = ({ name, description}: I, index: number) => {
      const optionList = input(`${name}`);
      const wrappedDescription = wordWrap(description, { indentation: this.dotswidth + 6 });

      return `${optionList} ${fillStrings[index]} ${wrappedDescription}`;
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
      (await this.formatBeforeOptionDescription(opt)) +
      opt.description +
      (await this.formatAfterOptionDescription(opt))
    );

    const wrappedDescription = wordWrap(fullDescription, { indentation: this.dotswidth + 6 });

    return `${optionList} ${weak('.').repeat(fullLength - optionListLength)} ${wrappedDescription}`;
  }

  async formatBeforeOptionDescription(opt: O): Promise<string> {
    return '';
  }

  async formatAfterOptionDescription(opt: O): Promise<string> {
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

    options = options.filter(opt => this.filterOptionCallback(opt));

    if (options.length === 0) {
      return '';
    }

    const formattedOptions = await Promise.all(options.map(async option => this.formatOptionLine(option)));

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
