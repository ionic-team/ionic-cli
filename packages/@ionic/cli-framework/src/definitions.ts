import * as minimistType from 'minimist';

export { HydratedCommandData } from './lib/namespace';

export type CommandLineInput = string | boolean | null | undefined | string[];
export type CommandLineInputs = string[];

export type Validator = (input?: string, key?: string) => true | string;

export interface CommandLineOptions extends minimistType.ParsedArgs {
  [arg: string]: CommandLineInput;
}

export type CommandOptionType = StringConstructor | BooleanConstructor;

export interface CommandInput {
  name: string;
  description: string;
  validators?: Validator[];
  required?: boolean;
  private?: boolean;
}

export type CommandOptionTypeDefaults = Map<CommandOptionType, CommandLineInput>;

export interface CommandOption {
  name: string;
  description: string;
  type?: CommandOptionType;
  default?: CommandLineInput;
  aliases?: string[];
  private?: boolean;
  intents?: string[];
  visible?: boolean;
  advanced?: boolean;
}

export interface NormalizedCommandOption extends CommandOption {
  type: CommandOptionType;
  default: CommandLineInput;
  aliases: string[];
}

export interface NormalizedMinimistOpts extends minimistType.Opts {
  string: string[];
  boolean: string[];
  alias: { [key: string]: string[] };
  default: { [key: string]: CommandLineInput };
}

export interface CommandData<T = CommandInput, U = CommandOption> {
  name: string;
  fullName?: string;
  description: string;
  longDescription?: string;
  exampleCommands?: string[];
  deprecated?: boolean;
  aliases?: string[];
  inputs?: T[];
  options?: U[];
  visible?: boolean;
}

export interface PackageJson {
  name: string;
  version: string;
  scripts?: { [key: string]: string };
  dependencies?: { [key: string]: string };
  devDependencies?: { [key: string]: string };
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
}

export interface ValidationError {
  message: string;
  inputName: string;
}
