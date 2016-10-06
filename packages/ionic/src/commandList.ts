import * as start from './commands/start';
import * as info from './commands/info';
import * as docs from './commands/docs';
import * as help from './commands/help';
import * as ionitron from './commands/ionitron';
import * as version from './commands/version';
import { CommandExports } from './ionic';

/**
 * List of commands that are available from ionic cli
 * Each command as a 1-to-1 mapping to a module with the same name
 */
export const allCommands = new Map<string, CommandExports>([
  ['start', start],
  ['info', info],
  ['help', help],
  ['h', help],
  ['ionitron', ionitron],
  ['docs', docs],
  ['version', version]
]);
