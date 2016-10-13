import * as minimist from 'minimist';
import { ICommand } from './definitions';
import { Logger } from './utils/logger';

export interface IonicCommandOptions {
  argv: minimist.ParsedArgs;
  utils: {
    log: Logger;
  };
  projectSettings: { [key: string]: any };
  commands: Map<string, ICommand>;
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

export function CommandMetadata(metadata: CommandData) {
  return function (target: Function) {
    target.prototype.metadata = metadata;
  };
}

export interface ICommand {
  metadata: CommandData;
  run(env: IonicCommandOptions): Promise<void>;
}

export type PluginExports = Map<string, ICommand>;
