import * as path from 'path';
import * as chalk from 'chalk';

import { FatalException } from '@ionic/cli-utils';
import { IonicNamespace } from '../commands';
import * as globalPlugin from '../index';

export const defaultPlugin = 'core';
export const knownPlugins = [defaultPlugin, 'cloud', 'cordova'];
export const PREFIX = 'cli-plugin-';
export const ERROR_PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND';
export const ERROR_PLUGIN_INVALID = 'PLUGIN_INVALID';

/**
 * Synchronously load a plugin
 */
export function loadPlugin(projectDir: string, name: string): any {
  let m: any;

  try {
    var mPath = require.resolve(path.join(projectDir, 'node_modules', '@ionic', `${PREFIX}${name}`));
    m = require(mPath);
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      throw ERROR_PLUGIN_NOT_FOUND;
    }
    throw e;
  }

  return m;
}

/**
 * Get inputs and command class based on arguments supplied
 */
export function resolvePlugin(projectDir: string, argv: string[]): [any, string[]] {
  let pluginName: string;
  let inputs: string[] = [];

  /**
   * If this module's primary namespace has the command then use it.
   */
  const ionicNamespace = new IonicNamespace();
  const isGlobalCmd = ionicNamespace.getCommands().has(argv[0]);
  if (isGlobalCmd || argv.length === 0) {
    return [
      globalPlugin,
      argv
    ];
  }

  /**
   * If the first arguement supplied contains a ':' then
   * it is assumed that this is calling a command in another
   * namespace. <namespaceName>:<commandName>
   *
   * Else it is likely a core command that should be loaded
   * from the 'core' plugin.
   */
  if (argv.length > 0 && argv[0].includes(':')) {

    let [firstArg, ...restOfArguments] = argv;
    [pluginName, firstArg] = firstArg.split(':');

    inputs = [firstArg, ...restOfArguments];

  } else if (knownPlugins.includes(argv[0])) {
    [pluginName, ...inputs] = argv;

  } else {
    pluginName = defaultPlugin;
    inputs = argv;
  }


  /**
   * Load the plugin using the pluginName provided
   */
  try {
    return [
      loadPlugin(projectDir, pluginName),
      inputs
    ];
  } catch (e) {

    /**
     * If plugin is not found then lets make a recommendation
     * based on whether we know the plugin exists.
     */
    if (e === ERROR_PLUGIN_NOT_FOUND) {
      if (knownPlugins.includes(pluginName)) {
        throw new FatalException('This plugin is not currently installed. Please execute the following to install it.\n\n'
                                + `    ${chalk.bold(`npm install --save @ionic/${PREFIX}${pluginName}`)}\n`);
      } else {
        throw new FatalException(`Unknown plugin: ${chalk.bold(PREFIX + pluginName)}.`);
      }
    }

    throw e;
  }
}
