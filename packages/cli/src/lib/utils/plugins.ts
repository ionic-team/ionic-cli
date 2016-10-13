import { CommandMap } from '../../definitions';

const plugins = new Set<string>(['cloud']);

export const PREFIX = '@ionic/cli-plugin-';
export const ERROR_PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND';

export class PluginLoader {

  readonly prefix = PREFIX;

  /**
   * Synchronously load a plugin
   */
  load(name: string): CommandMap {
    let m: () => CommandMap;

    try {
      m = require(`${this.prefix}${name}`);
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
    return plugins.has(name);
  }

}
