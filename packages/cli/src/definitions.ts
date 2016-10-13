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

export interface CommandData {
  name: string;
  description: string;
  isProjectTask: boolean;
  inputs?: {
    name: string;
    description: string;
  }[];
  availableOptions?: {
    name: string;
    description: string;
    type: StringConstructor | BooleanConstructor;
    default: string | number| boolean | null;
    aliases: string[];
  }[];
}

export interface CommandEnvironment {
  argv: minimist.ParsedArgs;
  utils: {
    log: ILogger;
  };
  project: IProject;
  commands: Map<string, ICommand>;
}

export interface ICommand {
  metadata: CommandData;
  run(env: CommandEnvironment): Promise<void>;
}

export type PluginExports = Map<string, ICommand>;
