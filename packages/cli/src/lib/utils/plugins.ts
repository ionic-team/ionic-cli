import { CommandMap, PluginModule } from '../../definitions';

const plugins = new Set<string>(['cloud']);

export const PREFIX = '@ionic/cli-plugin-';
export const ERROR_PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND';
export const ERROR_PLUGIN_INVALID = 'PLUGIN_INVALID';

function isPluginModule(m: any): m is PluginModule {
  return typeof m.getCommands === 'function';
}

export class PluginLoader {

  readonly prefix = PREFIX;

  /**
   * Synchronously load a plugin
   */
  load(name: string): CommandMap {
    let m: any;

    try {
      m = require(`${this.prefix}${name}`);
    } catch(e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        throw ERROR_PLUGIN_NOT_FOUND;
      }

      throw e;
    }

    if (!isPluginModule(m)) {
      throw ERROR_PLUGIN_INVALID;
    }

    return m.getCommands();
  }

  /**
   * Check to see if plugin is available for download
   */
  has(name: string): boolean {
    return plugins.has(name);
  }

}
