import Start from './commands/start';
import Info from './commands/info';
import Docs from './commands/docs';
import Help from './commands/help';
import Ionitron from './commands/ionitron';
import Version from './commands/version';
import { PluginExports } from './definitions';

/**
 * List of commands that are available from ionic cli
 * Each command as a 1-to-1 mapping to a module with the same name
 */
export default function (): PluginExports {
  return new Map<string, new () => any>([
    ['start', Start],
    ['info', Info],
    ['help', Help],
    ['ionitron', Ionitron],
    ['docs', Docs],
    ['version', Version]
  ]);
}