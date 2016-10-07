import { CommandExports } from '../ionic';

const availablePlugins = new Set<string>(['cloud']);

export const pluginPrefix = '@ionic/cli-plugin-';

/**
 * Synchronously load a plugin
 */
export default function(name: string): CommandExports {
  return require(`${pluginPrefix}${name}`);
}

/**
 * Check to see if plugin is available for download
 */
export function isPluginAvailable(name: string): boolean {
  return availablePlugins.has(name);
}
