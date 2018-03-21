import * as minimistType from 'minimist';
import { Chalk } from 'chalk';

export interface Colors {
  /**
   * Used to mark text as important. Comparable to HTML's <strong>.
   */
  strong: Chalk;

  /**
   * Used to mark text as less important.
   */
  weak: Chalk;

  /**
   * Used to mark text as input such as commands, inputs, options, etc.
   */
  input: Chalk;
}

export type ParsedArg = string | boolean | null | undefined | string[];
export type Validator = (input?: string, key?: string) => true | string;

export type CommandLineInputs = string[];

export interface CommandLineOptions extends minimistType.ParsedArgs {
  [arg: string]: ParsedArg;
}

export type CommandOptionType = StringConstructor | BooleanConstructor;

export interface CommandMetadataInput {
  name: string;
  summary: string;
  validators?: Validator[];
  private?: boolean;
}

export type MetadataGroup = string | number | symbol;

export interface CommandMetadataOption {
  name: string;
  summary: string;
  type?: CommandOptionType;
  default?: ParsedArg;
  aliases?: string[];
  groups?: MetadataGroup[];
}

export interface HydratedCommandOption {
  type: CommandOptionType;
  default: ParsedArg;
  aliases: string[];
}

export interface HydratedParseArgsOptions extends minimistType.Opts {
  string: string[];
  boolean: string[];
  alias: { [key: string]: string[]; };
  default: { [key: string]: ParsedArg; };
}

export interface Metadata {
  name: string;
  summary: string;
  description?: string;
  groups?: MetadataGroup[];
}

export interface CommandMetadata<I = CommandMetadataInput, O = CommandMetadataOption> extends Metadata {
  exampleCommands?: string[];
  aliases?: string[];
  inputs?: I[];
  options?: O[];
}

export interface CommandInstanceInfo<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  location: NamespaceLocateResult<C, N, M, I, O>;
  env: { [key: string]: string; };
  executor: IExecutor<C, N, M, I, O>;
}

export interface ICommand<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  namespace: N;

  getMetadata(runinfo?: Partial<CommandInstanceInfo<C, N, M, I, O>>): Promise<M>;
  run(inputs: CommandLineInputs, options: CommandLineOptions, runinfo?: Partial<CommandInstanceInfo<C, N, M, I, O>>): Promise<void>;
  validate(argv: CommandLineInputs): Promise<void>;
}

export type CommandMapKey = string | symbol;
export type CommandMapGetter<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> = () => Promise<C>;
export type NamespaceMapGetter<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> = () => Promise<N>;

export interface ICommandMap<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> extends Map<CommandMapKey, string | CommandMapGetter<C, N, M, I, O>> {
  getAliases(): Map<CommandMapKey, CommandMapKey[]>;
  resolveAliases(cmd: string): CommandMapGetter<C, N, M, I, O> | undefined;
}

export interface INamespaceMap<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> extends Map<string, NamespaceMapGetter<C, N, M, I, O>> {}

export interface INamespace<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  parent: N | undefined;

  getMetadata(): Promise<NamespaceMetadata>;
  getNamespaces(): Promise<INamespaceMap<C, N, M, I, O>>;
  getCommands(): Promise<ICommandMap<C, N, M, I, O>>;

  locate(argv: string[]): Promise<NamespaceLocateResult<C, N, M, I, O>>;
  getCommandMetadataList(): Promise<ReadonlyArray<HydratedCommandMetadata<C, N, M, I, O>>>;
}

export type CommandPathItem<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> = [string, C | N];

export interface NamespaceLocateResult<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  readonly obj: C | N;
  readonly args: ReadonlyArray<string>;
  readonly path: ReadonlyArray<CommandPathItem<C, N, M, I, O>>;
}

export type HydratedCommandMetadata<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> = M & {
  readonly command: C;
  readonly namespace: N;
  readonly path: ReadonlyArray<CommandPathItem<C, N, M, I, O>>;
  readonly aliases: ReadonlyArray<string>;
};

export interface NamespaceMetadata extends Metadata {}

export interface IExecutor<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  readonly namespace: N;

  execute(argv: string[], env: { [key: string]: string; }): Promise<void>;
  run(command: C, cmdargs: string[], runinfo?: Partial<CommandInstanceInfo<C, N, M, I, O>>): Promise<void>;
}

export interface PackageJson {
  name: string;
  version: string;
  main?: string;
  description?: string;
  bin?: { [key: string]: string; };
  scripts?: { [key: string]: string; };
  dependencies?: { [key: string]: string; };
  devDependencies?: { [key: string]: string; };
}

export interface Validators {
  required: Validator;
  email: Validator;
  numeric: Validator;
  url: Validator;
}

export interface ValidationError {
  key: string;
  message: string;
  validator: Validator;
}
