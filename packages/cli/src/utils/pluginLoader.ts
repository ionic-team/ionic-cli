import { PluginExports } from '../definitions';

const availablePlugins = new Set<string>(['cloud']);

export const pluginPrefix = '@ionic/cli-plugin-';
export const ERROR_PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND';

/**
 * Synchronously load a plugin
 */
export default function(name: string): PluginExports {
  let m: () => PluginExports;

  try {
    m = require(`${pluginPrefix}${name}`);
  } catch(e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      throw ERROR_PLUGIN_NOT_FOUND;
    }

    throw e;
  }

  return m();
}

/**
 * Check to see if plugin is available for download
 */
export function isPluginAvailable(name: string): boolean {
  return availablePlugins.has(name);
}
