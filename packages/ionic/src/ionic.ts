#!/usr/bin/env node

import * as minimist from 'minimist';
import { allCommands } from './commandList';

declare function require(moduleName: string): any;

// Check version?

const defaultCommand = 'help';
const argv = minimist(process.argv.slice(2));

let cmd = argv._[0];
let args: Array<string> = [];

/*
 * Each plugin can register its namespace and its commands.
 * - Should we allow a plugin to register its command without a namespace?
 *  - If so only Ionic specific plugins
 *  -  
 * Each plugin must have a namespace
 * Each command is called with specific environment information
 */

if (allCommands.has(cmd)) {
  args = args.concat(process.argv.slice(3));
} else {
  cmd = defaultCommand;
  args = args.concat(process.argv.slice(2));
}

allCommands.get(cmd)(args);
