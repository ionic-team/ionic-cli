#!/usr/bin/env node

import * as minimist from 'minimist';
import * as chalk from 'chalk';
import { allCommands } from './commandList';
import getIonicPluginCommand, { isPluginAvailable, pluginPrefix } from './utils/pluginLoader';
import logger, { Logger } from './utils/logger';

export interface ionicCommand {
  args: minimist.ParsedArgs;
  log: Logger;
}

declare function require(moduleName: string): any;

// Check version?
const defaultCommand = 'help';
const argv = minimist(process.argv.slice(2));

// options
const logLevel: string = argv['loglevel'] || 'warn';

let cmd = argv._[0];
let cmdFunction: Function;
let args: Array<string> = [];

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
  cmdFunction = allCommands.get(cmd);
  args = args.concat(process.argv.slice(3));

/*
 * Check if command exists as a plugin
 */
} else if (!cmdFunction) {
  try {
    cmdFunction = getIonicPluginCommand(cmd);
    args = args.concat(process.argv.slice(4));

  /*
  * If command does not exist then lets show them help
  */
  } catch (e) {
    if (isPluginAvailable(cmd)) {
      log.warn('This plugin is not currently installed. Please execute the following to install it. \n\n   ' + chalk.bold(`npm install ${pluginPrefix}${cmd}`) + '\n');
      process.exit(1);
    }
    cmd = defaultCommand;
    cmdFunction = allCommands.get(cmd);
    args = args.concat(process.argv.slice(2));
  }
}

log.info('executing', cmd);
cmdFunction({
  args,
  log
});
