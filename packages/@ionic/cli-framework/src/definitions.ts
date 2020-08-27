import { Opts as ParseArgsOptions, ParsedArgs } from 'minimist';

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
}

export interface TextFootnote {
  id: string | number;
  text: string;
}

export interface LinkFootnote {
  id: string | number;
  url: string;
  shortUrl?: string;
}

export type Footnote = TextFootnote | LinkFootnote;

export const enum MetadataGroup {
  ADVANCED = 'advanced',
  BETA = 'beta',
  DEPRECATED = 'deprecated',
  EXPERIMENTAL = 'experimental',
  HIDDEN = 'hidden',
  PAID = 'paid',
}

export interface Metadata {
  name: string;
  summary: string;
  description?: string;
  footnotes?: Footnote[];
  groups?: string[];
}

export interface CommandMetadataOption extends Metadata {
  type?: CommandOptionType;
  default?: string | boolean;
  aliases?: string[];
  spec?: {
    value?: string;
  };
}

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
  env: NodeJS.ProcessEnv;
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
export type ICommandMap<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> = import('@ionic/utils-object').AliasedMap<string, CommandMapGetter<C, N, M, I, O>>;
export type INamespaceMap<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> = import('@ionic/utils-object').AliasedMap<string, NamespaceMapGetter<C, N, M, I, O>>;

export interface NamespaceLocateOptions {
  useAliases?: boolean;
}

export interface INamespace<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  root: N;
  parent: N | undefined;

  locate(argv: readonly string[], options?: NamespaceLocateOptions): Promise<NamespaceLocateResult<C, N, M, I, O>>;
  getMetadata(): Promise<NamespaceMetadata>;
  getNamespaces(): Promise<INamespaceMap<C, N, M, I, O>>;

  getCommands(): Promise<ICommandMap<C, N, M, I, O>>;
  getCommandMetadataList(): Promise<readonly HydratedCommandMetadata<C, N, M, I, O>[]>;
  groupCommandsByNamespace(commands: readonly HydratedCommandMetadata<C, N, M, I, O>[]): Promise<readonly (HydratedNamespaceMetadata<C, N, M, I, O> & { commands: readonly HydratedCommandMetadata<C, N, M, I, O>[]; })[]>;
}

export type CommandPathItem<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> = [string, C | N];

export interface NamespaceLocateResult<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  readonly obj: C | N;
  readonly args: readonly string[];
  readonly path: readonly CommandPathItem<C, N, M, I, O>[];
}

export type HydratedCommandMetadata<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> = M & {
  readonly command: C;
  readonly namespace: N;
  readonly path: readonly CommandPathItem<C, N, M, I, O>[];
  readonly aliases: readonly string[];
};

export interface NamespaceMetadata extends Metadata {}

export interface HydratedNamespaceMetadata<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> extends Required<Readonly<NamespaceMetadata>> {
  readonly namespace: N;
  readonly aliases: readonly string[];
}

export interface IExecutor<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  readonly namespace: N;

  locate(argv: readonly string[]): Promise<NamespaceLocateResult<C, N, M, I, O>>;
  execute(location: NamespaceLocateResult<C, N, M, I, O>): Promise<void>;
  execute(argv: readonly string[], env: NodeJS.ProcessEnv): Promise<void>;
  run(command: C, cmdargs: readonly string[], runinfo?: Partial<CommandInstanceInfo<C, N, M, I, O>>): Promise<void>;
}

export interface PackageJson {
  name: string;
  version: string;
  main?: string;
  description?: string;
  bin?: { [key: string]: string | undefined; };
  scripts?: { [key: string]: string | undefined; };
  dependencies?: { [key: string]: string | undefined; };
  devDependencies?: { [key: string]: string | undefined; };
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
