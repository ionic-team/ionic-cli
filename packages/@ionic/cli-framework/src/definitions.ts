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

export type CommandMetadataGroup = string | number | symbol;

export interface CommandMetadataOption {
  name: string;
  description: string;
  type?: CommandOptionType;
  default?: ParsedArg;
  aliases?: string[];
  groups?: CommandMetadataGroup[];
}

export interface NormalizedCommandOption extends CommandMetadataOption {
  type: CommandOptionType;
  default: ParsedArg;
  aliases: string[];
}

export interface NormalizedParseArgsOptions extends minimistType.Opts {
  string: string[];
  boolean: string[];
  alias: { [key: string]: string[]; };
  default: { [key: string]: ParsedArg; };
}

export interface Metadata {
  name: string;
  description: string;
  longDescription?: string;
  deprecated?: boolean;
}

export interface CommandMetadata<I = CommandMetadataInput, O = CommandMetadataOption> extends Metadata {
  exampleCommands?: string[];
  aliases?: string[];
  inputs?: I[];
  options?: O[];
  visible?: boolean;
}

export interface ICommand<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  namespace: N;

  getMetadata(): Promise<M>;
  run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void>;
  validate(argv: CommandLineInputs): Promise<void>;
}

export type ICommandMapKey = string | symbol;
export type ICommandMapGetter<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> = () => Promise<C>;
export type INamespaceMapGetter<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> = () => Promise<N>;

export interface ICommandMap<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> extends Map<ICommandMapKey, string | ICommandMapGetter<C, N, M, I, O>> {
  getAliases(): Map<ICommandMapKey, ICommandMapKey[]>;
  resolveAliases(cmd: string): ICommandMapGetter<C, N, M, I, O> | undefined;
}

export interface INamespaceMap<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> extends Map<string, INamespaceMapGetter<C, N, M, I, O>> {}

export interface INamespace<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  parent: N | undefined;

  getMetadata(): Promise<INamespaceMetadata>;
  getNamespaces(): Promise<INamespaceMap<C, N, M, I, O>>;
  getCommands(): Promise<ICommandMap<C, N, M, I, O>>;

  locate(argv: string[]): Promise<INamespaceLocateResult<C, N, M, I, O>>;
  getCommandMetadataList(): Promise<(M & IHydratedCommandData<C, N, M, I, O>)[]>;
}

export type CommandPathItem<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> = [string, C | N];

export interface INamespaceLocateResult<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  obj: C | N;
  args: string[];
  path: CommandPathItem<C, N, M, I, O>[];
}

export interface IHydratedCommandData<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  command: C;
  namespace: N;
  path: CommandPathItem<C, N, M, I, O>[];
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
