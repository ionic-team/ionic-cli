import DocsCommand from './docs';
import HelpCommand from './help';
import InfoCommand from './info';
import IonitronCommand from './ionitron';
import LoginCommand from './login';
import StartCommand from './start';
import VersionCommand from './version';
import { CommandMap, ICommand } from '../definitions';

/**
 * List of commands that are available from ionic cli
 * Each command as a 1-to-1 mapping to a module with the same name
 */
export default function(): CommandMap {
  let m = new Map<string, ICommand>();

  m.set('docs', new DocsCommand());
  m.set('help', new HelpCommand());
  m.set('info', new InfoCommand());
  m.set('ionitron', new IonitronCommand());
  m.set('login', new LoginCommand());
  m.set('start', new StartCommand());
  m.set('version', new VersionCommand());

  return m;
}
