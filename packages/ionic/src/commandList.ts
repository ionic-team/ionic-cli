'use strict';

import start from './commands/start';
import info from './commands/info';
import docs from './commands/docs';
import help from './commands/help';
import ionitron from './commands/ionitron';
import version from './commands/version';

/*
 * List of shorthands that are available for each command
 */
const shorthands = [
  ['h', help]
];

/**
 * List of affordances that are available for each command
 * Sometimes we will add misspellings here or if we change a command name
 */
const affordances: any[] = [

];

const hiddenCommands = [
  ['ionitron', ionitron]
];

/**
 * List of commands that are available from ionic cli
 * Each command as a 1-to-1 mapping to a module with the same name
 */
export const orderedListOfCommands = [
  ['start', start],
  ['info', info],
  ['help', help],
  ['docs', docs],
  ['version', version]
];

export const allCommands = new Map<string, Function>([
  ...shorthands,
  ...affordances,
  ...hiddenCommands,
  ...orderedListOfCommands
]);
