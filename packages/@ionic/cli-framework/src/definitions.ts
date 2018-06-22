import * as os from 'os';

import { Opts as ParseArgsOptions, ParsedArgs } from 'minimist';

import { AliasedMap } from './utils/object';

export type NetworkInterface = { device: string; } & os.NetworkInterfaceInfo;

export type ParsedArg = string | boolean | null | undefined | string[];
export type Validator = (input?: string, key?: string) => true | string;

export type CommandLineInputs = string[];

export interface CommandLineOptions extends ParsedArgs {
  [arg: string]: ParsedArg;
}

export type CommandOptionType = StringConstructor | BooleanConstructor;

export interface CommandMetadataInput {
  name: string;
  summary: string;
  validators?: Validator[];
  private?: boolean;
}

export interface Metadata {
  name: string;
  summary: string;
  description?: string;
  groups?: string[];
}

export interface CommandMetadataOption extends Metadata {
  type?: CommandOptionType;
  default?: string | boolean;
  aliases?: string[];
}

export type HydratedCommandMetadataOption<O extends CommandMetadataOption> = Readonly<Required<O>>;

export { ParseArgsOptions };

export interface HydratedParseArgsOptions extends ParseArgsOptions {
  string: string[];
  boolean: string[];
  alias: { [key: string]: string[]; };
  default: { [key: string]: string | boolean; };
}

export interface CommandMetadata<I = CommandMetadataInput, O = CommandMetadataOption> extends Metadata {
  exampleCommands?: string[];
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

export type CommandMapGetter<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> = () => Promise<C>;
export type NamespaceMapGetter<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> = () => Promise<N>;
export type ICommandMap<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> = AliasedMap<string, CommandMapGetter<C, N, M, I, O>>;
export type INamespaceMap<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> = AliasedMap<string, NamespaceMapGetter<C, N, M, I, O>>;

export interface INamespace<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  root: N;
  parent: N | undefined;

  locate(argv: ReadonlyArray<string>): Promise<NamespaceLocateResult<C, N, M, I, O>>;
  getMetadata(): Promise<NamespaceMetadata>;
  getNamespaces(): Promise<INamespaceMap<C, N, M, I, O>>;

  getCommands(): Promise<ICommandMap<C, N, M, I, O>>;
  getCommandMetadataList(): Promise<ReadonlyArray<HydratedCommandMetadata<C, N, M, I, O>>>;
  groupCommandsByNamespace(commands: ReadonlyArray<HydratedCommandMetadata<C, N, M, I, O>>): Promise<ReadonlyArray<HydratedNamespaceMetadata<C, N, M, I, O> & { commands: ReadonlyArray<HydratedCommandMetadata<C, N, M, I, O>>; }>>;
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

export interface HydratedNamespaceMetadata<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> extends Required<Readonly<NamespaceMetadata>> {
  readonly namespace: N;
  readonly aliases: ReadonlyArray<string>;
}

export interface IExecutor<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  readonly namespace: N;

  execute(argv: ReadonlyArray<string>, env: { [key: string]: string; }): Promise<void>;
  run(command: C, cmdargs: ReadonlyArray<string>, runinfo?: Partial<CommandInstanceInfo<C, N, M, I, O>>): Promise<void>;
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
  slug: Validator;
}

export interface ValidationError {
  key: string;
  message: string;
  validator: Validator;
}

export interface OutputStrategy {
  readonly stream: NodeJS.WritableStream;
}

export interface RedrawLine {
  redrawLine(msg?: string): void;
}
