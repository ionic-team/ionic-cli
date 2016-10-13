import { PluginExports, CommandExports } from '@ionic/cli';

/**
 * List of commands that are available from ionic cli
 * Each command as a 1-to-1 mapping to a module with the same name
 */
export default function (): PluginExports {
  return new Map<string, CommandExports>([
  ]);
}
