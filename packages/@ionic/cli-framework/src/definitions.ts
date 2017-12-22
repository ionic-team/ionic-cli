import * as minimistType from 'minimist';

export type ParsedArg = string | boolean | null | undefined | string[];
export type Validator = (input?: string, key?: string) => true | string;

export type CommandLineInputs = string[];

export interface CommandLineOptions extends minimistType.ParsedArgs {
  [arg: string]: ParsedArg;
}

export type CommandOptionType = StringConstructor | BooleanConstructor;

export interface CommandMetadataInput {
  name: string;
  description: string;
  validators?: Validator[];
  private?: boolean;
}

export interface CommandMetadataOption {
  name: string;
  description: string;
  type?: CommandOptionType;
  default?: ParsedArg;
  aliases?: string[];
  private?: boolean;
  intents?: string[];
  visible?: boolean;
  advanced?: boolean;
}

export interface NormalizedCommandOption extends CommandMetadataOption {
  type: CommandOptionType;
  default: ParsedArg;
  aliases: string[];
}

export interface NormalizedParseArgsOptions extends minimistType.Opts {
  string: string[];
  boolean: string[];
  alias: { [key: string]: string[] };
  default: { [key: string]: ParsedArg };
}

export interface Metadata {
  name: string;
  description: string;
  longDescription?: string;
  deprecated?: boolean;
}

export interface CommandMetadata<T = CommandMetadataInput, U = CommandMetadataOption> extends Metadata {
  exampleCommands?: string[];
  aliases?: string[];
  inputs?: T[];
  options?: U[];
  visible?: boolean;
}

export interface ICommand<T extends INamespace<ICommand<T, U, V, W>, U, V, W>, U extends CommandMetadata<V, W>, V extends CommandMetadataInput, W extends CommandMetadataOption> {
  namespace: T;

  getMetadata(): Promise<U>;
  run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void>;
  validate(argv: CommandLineInputs): Promise<void>;
}

export type ICommandMapKey = string | symbol;
export type ICommandMapGetter<T extends ICommand<INamespace<T, U, V, W>, U, V, W>, U extends CommandMetadata<V, W>, V extends CommandMetadataInput, W extends CommandMetadataOption> = () => Promise<T>;
export type INamespaceMapGetter<T extends ICommand<INamespace<T, U, V, W>, U, V, W>, U extends CommandMetadata<V, W>, V extends CommandMetadataInput, W extends CommandMetadataOption> = () => Promise<INamespace<T, U, V, W>>;

export interface ICommandMap<T extends ICommand<INamespace<T, U, V, W>, U, V, W>, U extends CommandMetadata<V, W>, V extends CommandMetadataInput, W extends CommandMetadataOption> extends Map<ICommandMapKey, string | ICommandMapGetter<T, U, V, W>> {
  getAliases(): Map<ICommandMapKey, ICommandMapKey[]>;
  resolveAliases(cmd: string): ICommandMapGetter<T, U, V, W> | undefined;
}

export interface INamespaceMap<T extends ICommand<INamespace<T, U, V, W>, U, V, W>, U extends CommandMetadata<V, W>, V extends CommandMetadataInput, W extends CommandMetadataOption> extends Map<string, INamespaceMapGetter<T, U, V, W>> {}

export interface INamespace<T extends ICommand<INamespace<T, U, V, W>, U, V, W>, U extends CommandMetadata<V, W>, V extends CommandMetadataInput, W extends CommandMetadataOption> {
  parent: INamespace<T, U, V, W> | undefined;

  getMetadata(): Promise<INamespaceMetadata>;
  getNamespaces(): Promise<INamespaceMap<T, U, V, W>>;
  getCommands(): Promise<ICommandMap<T, U, V, W>>;

  locate(argv: string[]): Promise<INamespaceLocateResult<T, U, V, W>>;
  getCommandMetadataList(): Promise<(U & IHydratedCommandData<T, U, V, W>)[]>;
}

export type CommandPathItem<T extends ICommand<INamespace<T, U, V, W>, U, V, W>, U extends CommandMetadata<V, W>, V extends CommandMetadataInput, W extends CommandMetadataOption> = [string, T | INamespace<T, U, V, W>];

export interface INamespaceLocateResult<T extends ICommand<INamespace<T, U, V, W>, U, V, W>, U extends CommandMetadata<V, W>, V extends CommandMetadataInput, W extends CommandMetadataOption> {
  obj: T | INamespace<T, U, V, W>;
  args: string[];
  path: CommandPathItem<T, U, V, W>[];
}

export interface IHydratedCommandData<T extends ICommand<INamespace<T, U, V, W>, U, V, W>, U extends CommandMetadata<V, W>, V extends CommandMetadataInput, W extends CommandMetadataOption> {
  command: T;
  namespace: INamespace<T, U, V, W>;
  path: CommandPathItem<T, U, V, W>[];
  aliases: string[];
}

export interface INamespaceMetadata extends Metadata {}

export interface PackageJson {
  name: string;
  version: string;
  scripts?: { [key: string]: string; };
  dependencies?: { [key: string]: string; };
  devDependencies?: { [key: string]: string; };
}

export interface BowerJson {
  name: string;
  dependencies?: { [key: string]: string };
  devDependencies?: { [key: string]: string };
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
