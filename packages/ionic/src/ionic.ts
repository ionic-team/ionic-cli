#!/usr/bin/env node

import * as minimist from 'minimist';
import * as chalk from 'chalk';
import { allCommands } from './commandList';
import getIonicPlugin, { isPluginAvailable, pluginPrefix } from './utils/pluginLoader';
import logger, { Logger } from './utils/logger';
import { metadataToOptimistOptions } from './utils/commandOptions';

export interface ionicCommandOptions {
  argv: minimist.ParsedArgs;
  utils: {
    log: Logger;
  };
  allCommands: Map<string, CommandExports>;
}

export interface CommandMetadata {
  name: string;
  description: string;
  isProjectTask: boolean;
  inputs?: {
    name: string;
    description: string;
  }[],
  availableOptions?: {
    name: string;
    description: string;
    type: StringConstructor | BooleanConstructor;
    default: string | number| boolean | null;
    aliases: string[];
  }[];
}

export type CommandExports = {
  run: Function;
  metadata: CommandMetadata;
};

declare function require(moduleName: string): any;

// Check version?
const defaultCommand = 'help';
const argv = minimist(process.argv.slice(2));

// Global CLI option setup
const logLevel: string = argv['loglevel'] || 'warn';

let args: Array<string> = [];
let cmd = argv._[0];
let command: CommandExports;

const log = logger({
  level: logLevel,
  prefix: ''
});

/*
 * Each plugin can register its namespace and its commands.
 * - Should we allow a plugin to register its command without a namespace?
 *  - If so only Ionic specific plugins
 *  -  
 * Each plugin must have a namespace
 * Each command is called with specific environment information
 */

/*
 * Check if command exists local to this package
 */
if (allCommands.has(cmd)) {
  command = allCommands.get(cmd);
  args = process.argv.slice(3);

/*
 * Check if command exists as a plugin
 */
} else {
  try {
    command = getIonicPlugin(cmd);
    args = process.argv.slice(4);

  /*
  * If command does not exist then lets show them help
  */
  } catch (e) {
    if (isPluginAvailable(cmd)) {
      log.msg('This plugin is not currently installed. Please execute the following to install it.');
      log.msg('\n    ' + chalk.bold(`npm install ${pluginPrefix}${cmd}`) + '\n');
      process.exit(1);
    }

    cmd = defaultCommand;
    command = allCommands.get(cmd);
  }
}

log.info('executing', cmd);

(async function runCommand() {
  const options = metadataToOptimistOptions(command.metadata);
  const argv: minimist.ParsedArgs = minimist(args, options);
  try {
    await command.run({
      argv,
      utils: {
        log
      },
      allCommands
    });
  } catch (e) {
    log.error(e.message);
    process.exit(1);
  }
})();
