import { Namespace } from '@ionic/cli-utils';
import * as path from 'path';

const plugins = new Set<string>(['cloud', 'cordova']);

export const PREFIX = '@ionic/cli-plugin-';
export const ERROR_PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND';
export const ERROR_PLUGIN_INVALID = 'PLUGIN_INVALID';

function isNamespace(m: any): m is typeof Namespace {
  return m.prototype instanceof Namespace; // TODO: is this dangerous?
}

export class PluginLoader {
  readonly prefix = PREFIX;

  /**
   * Synchronously load a plugin
   */
  load(name: string): typeof Namespace {
    let m: any;

    try {
      var mPath = require.resolve(path.join(process.cwd(), 'node_modules', `${this.prefix}${name}`));
      m = require(mPath);
    } catch (e) {
      console.log(e);
      if (e.code === 'MODULE_NOT_FOUND') {
        throw ERROR_PLUGIN_NOT_FOUND;
      }

      throw e;
    }

    if (!isNamespace(m.default)) {
      throw ERROR_PLUGIN_INVALID;
    }

    return m.default;
  }

  /**
   * Check to see if plugin is available for download
   */
  has(name: string): boolean {
    return plugins.has(name);
  }
}
