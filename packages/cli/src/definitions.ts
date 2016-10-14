import * as minimist from 'minimist';
import { ICommand } from './definitions';

export type LogFn = (message?: any, ...args: any[]) => void;

export interface LoggerOptions {
  level: string;
  prefix: string;
}

export interface ILogger {
  trace: LogFn;
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  msg: Function;
}

export interface ProjectFile {
  name: string;
  app_id?: string;
  [key: string]: any;
}

export interface IProject {
  directory: string;

  load(): Promise<ProjectFile>;
  save(projectFile: ProjectFile): Promise<void>;
}

export type CommandOptionType = StringConstructor | BooleanConstructor;
export type CommandOptionDefault = string | number| boolean | null;
export type CommandOptionTypeDefaults = Map<CommandOptionType, CommandOptionDefault>;

export interface CommandOption {
  name: string;
  description: string;
  type?: CommandOptionType;
  default?: CommandOptionDefault;
  aliases?: string[];
}

export interface NormalizedCommandOption extends CommandOption {
  type: CommandOptionType;
  default: CommandOptionDefault;
  aliases: string[];
}

export interface CommandInput {
  name: string;
  description: string;
}

export interface CommandData {
  name: string;
  description: string;
  isProjectTask: boolean;
  inputs?: CommandInput[];
  options?: CommandOption[];
}

export interface CommandEnvironment {
  commands: Map<string, ICommand>;
  inputs: string[];
  log: ILogger;
  options: { [arg: string]: any };
  project: IProject;
}

export interface ICommand {
  metadata: CommandData;
  run(env: CommandEnvironment): Promise<void>;
}

export type CommandMap = Map<string, ICommand>;
