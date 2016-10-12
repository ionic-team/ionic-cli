#!/usr/bin/env node

import * as minimist from 'minimist';
import * as chalk from 'chalk';
import getAllCommands from './commandList';
import getIonicPlugin, { isPluginAvailable, pluginPrefix } from './utils/pluginLoader';
import logger, { Logger } from './utils/logger';
import { metadataToOptimistOptions } from './utils/commandOptions';
import loadProject from './utils/project';

export interface ionicCommandOptions {
  argv: minimist.ParsedArgs;
  utils: {
    log: Logger;
  };
  projectSettings: { [key: string]: any };
  allCommands: Map<string, CommandExports>;
}

export interface CommandMetadata {
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

export abstract class Command {
    abstract public run(env: CommandOptions): Promise<void>;
}

export interface CommandExports {
  run: Function;
  metadata: CommandMetadata;
};

export type PluginExports = Map<string, CommandExports>;

// Check version?
const defaultCommand = 'help';
const argv = minimist(process.argv.slice(2));

// Global CLI option setup
const logLevel: string = argv['loglevel'] || 'warn';
const log = logger({
  level: logLevel,
  prefix: ''
});
const projectSettings = loadProject('.');

let args: Array<string> = [];
let cmd = argv._[0];
let command: CommandExports;
const allCommands = getAllCommands();

/*
 * Each plugin can register its namespace and its commands.
 * - Should we allow a plugin to register its command without a namespace?
 *  - If so only Ionic specific plugins
 *  -  
 * Each plugin must have a namespace
 * Each command is called with specific environment information
 */

/**
 * Check if command exists local to this package
 */
if (allCommands.has(cmd)) {
  command = allCommands.get(cmd);
  args = process.argv.slice(3);

/**
 * Check if command exists as a plugin
 * - Each npm package is named as @ionic/cli-plugin-<name>
 * - Each plugin command is prefixed with <plugin name>:
 */
} else if (cmd.indexOf(':') !== -1) {
  const [pluginName, pluginCommand] = cmd.split(':');
  try {
    command = getIonicPlugin(pluginName).get(pluginCommand);
    args = process.argv.slice(3);

  /**
   * If command does not exist then lets show them help
   */
  } catch (e) {
    if (isPluginAvailable(pluginName)) {
      log.msg(`
This plugin is not currently installed. Please execute the following to install it.

    ${chalk.bold(`npm install ${pluginPrefix}${pluginName}`)}
`);
      process.exit(1);
    }

    cmd = defaultCommand;
    command = allCommands.get(cmd);
  }
} else {
  cmd = defaultCommand;
  command = allCommands.get(cmd);
}

log.info('executing', cmd);

(async function runCommand() {
  const options = metadataToOptimistOptions(command.metadata);
  const argv: minimist.ParsedArgs = minimist(args, options);
  try {
    await command.run({
      args,
      argv,
      projectSettings,
      utils: {
        log
      },
      allCommands
    });
  } catch (e) {
    log.error(e);
    process.exit(1);
  }
})();
