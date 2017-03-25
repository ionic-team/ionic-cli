import * as path from 'path';
import * as chalk from 'chalk';
import * as inquirer from 'inquirer';

import {
  ERROR_FILE_INVALID_JSON,
  ERROR_FILE_NOT_FOUND,
  IonicEnvironment,
  Plugin,
  Shell,
  TaskChain,
  fsReadDir,
  fsReadJsonFile,
} from '@ionic/cli-utils';

import { load } from './utils/commonjs-loader';

export const KNOWN_PLUGINS = ['cordova']; // known plugins with commands
export const ORG_PREFIX = '@ionic';
export const PLUGIN_PREFIX = 'cli-plugin-';
export const ERROR_PLUGIN_NOT_INSTALLED = 'PLUGIN_NOT_INSTALLED';
export const ERROR_PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND';
export const ERROR_PLUGIN_INVALID = 'PLUGIN_INVALID';

export async function loadPlugins(env: IonicEnvironment) {
  if (!env.project.directory) {
    return async (eventName: string): Promise<any> => {};
  }

  const mPath = path.join(env.project.directory, 'node_modules', '@ionic');
  const ionicModules = await fsReadDir(mPath);

  const pluginPkgs = ionicModules
    .filter(pkgName => pkgName.indexOf(PLUGIN_PREFIX) === 0)
    .map(pkgName => `${ORG_PREFIX}/${pkgName}`);

  const plugins = await Promise.all(
    pluginPkgs.map(pkgName => {
      return loadPlugin(env.project.directory, pkgName, false);
    })
  );

  for (let plugin of plugins) {
    const ns = plugin.namespace;

    if (ns) {
      env.namespace.namespaces.set(ns.name, () => ns);
    }

    if (plugin.registerEvents) {
      plugin.registerEvents(env.emitter);
    }
  }
}

/**
 * Synchronously load a plugin
 */
export async function loadPlugin(projectDir: string, pluginName: string, askToInstall: boolean = true): Promise<Plugin> {
  let m: Plugin | undefined;

  try {
    var mPath = path.join(projectDir, 'node_modules', ...pluginName.split('/'));
    m = load(mPath);
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }

    // Unfortuantly we need to check the not only the code but the error message
    let foundPackageNeeded = KNOWN_PLUGINS.map(kp => `${ORG_PREFIX}/${PLUGIN_PREFIX}${kp}`)
      .find(kp => e.message && e.message.includes(kp));
    if (!foundPackageNeeded) {
      throw `Dependency missing for ${chalk.bold(pluginName)}:\n\n  ${chalk.red('[ERROR]')}: ${e.message}`;
    }
  }
  if (!m && !askToInstall) {
    throw ERROR_PLUGIN_NOT_INSTALLED;
  }
  if (!m) {
    const answers = await inquirer.prompt([{
      type: 'confirm',
      name: 'installPlugin',
      message: `This command's plugin ${chalk.green(pluginName)} is not installed would you like to install it and continue?`
    }]);

    if (answers['installPlugin']) {
      const releaseChannelName = await getReleaseChannelName();
      const pluginInstallVersion = `${pluginName}` + (releaseChannelName ? `@${releaseChannelName}` : '');
      const tasks = new TaskChain();

      tasks.next(`Executing npm command: ${chalk.bold(`npm install --save-dev ${pluginInstallVersion}`)}`);
      await new Shell().run('npm', ['install', '--save-dev', pluginInstallVersion ]);
      tasks.end();

      return loadPlugin(projectDir, pluginName);
    } else {
      throw ERROR_PLUGIN_NOT_INSTALLED;
    }
  }

  return m;
}

export async function getReleaseChannelName(): Promise<string | undefined> {
  let jsonStructure: any;
  const filePath = path.resolve(__dirname, '..', 'package.json');
  try {
    jsonStructure = await fsReadJsonFile(filePath);
  } catch (e) {
    if (e === ERROR_FILE_NOT_FOUND) {
      throw new Error(`${filePath} not found`);
    } else if (e === ERROR_FILE_INVALID_JSON) {
      throw new Error(`${filePath} is not valid JSON.`);
    }
    throw e;
  }
  if (jsonStructure.version.includes('alpha')) {
    return 'canary';
  }
  if (jsonStructure.version.includes('beta')) {
    return 'beta';
  }
}
