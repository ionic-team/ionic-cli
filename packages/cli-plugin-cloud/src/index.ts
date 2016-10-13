import { ICommand, PluginExports } from '@ionic/cli';
import SSHCommand from './commands/ssh';

/**
 * List of commands that are available from ionic cli
 * Each command as a 1-to-1 mapping to a module with the same name
 */
export default function (): PluginExports {
  let m = new Map<string, ICommand>();

  m.set('ssh', new SSHCommand());

  return m;
}
