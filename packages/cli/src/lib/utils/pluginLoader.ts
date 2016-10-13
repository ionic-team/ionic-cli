import { PluginExports } from '../../definitions';

const availablePlugins = new Set<string>(['cloud']);

export const pluginPrefix = '@ionic/cli-plugin-';
export const ERROR_PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND';

export class PluginLoader {

  /**
   * Synchronously load a plugin
   */
  load(name: string): PluginExports {
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
  has(name: string): boolean {
    return availablePlugins.has(name);
  }

}
