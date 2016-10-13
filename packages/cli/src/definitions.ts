import * as minimist from 'minimist';
import { Logger } from './utils/logger';

export interface IonicCommandOptions {
  argv: minimist.ParsedArgs;
  utils: {
    log: Logger;
  };
  projectSettings: { [key: string]: any };
  allCommands: Map<string, any>;
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
  return function (target: any) {
    target.metadata = metadata;
    return target;
  };
}
export abstract class Command {
   public abstract run(env: IonicCommandOptions): Promise<void> | void;
}

export type PluginExports = Map<string, any>;
