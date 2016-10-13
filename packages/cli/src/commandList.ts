import StartCommand from './commands/start';
import InfoCommand from './commands/info';
import DocsCommand from './commands/docs';
import HelpCommand from './commands/help';
import IonitronCommand from './commands/ionitron';
import VersionCommand from './commands/version';
import { ICommand, PluginExports } from './definitions';

/**
 * List of commands that are available from ionic cli
 * Each command as a 1-to-1 mapping to a module with the same name
 */
export default function (): PluginExports {
  let m = new Map<string, ICommand>();

  m.set('start', new StartCommand());
  m.set('info', new InfoCommand());
  m.set('help', new HelpCommand());
  m.set('ionitron', new IonitronCommand());
  m.set('docs', new DocsCommand());
  m.set('version', new VersionCommand());

  return m;
}
