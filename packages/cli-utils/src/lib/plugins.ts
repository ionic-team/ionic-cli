import * as path from 'path';
import * as chalk from 'chalk';

import { IonicEnvironment, Plugin } from '../definitions';
import { load } from './modules';
import { Shell } from './shell';
import { ERROR_FILE_INVALID_JSON, ERROR_FILE_NOT_FOUND, fsReadDir, fsReadJsonFile } from './utils/fs';
import { TaskChain } from './utils/task';
import { getGlobalProxy } from './http';

export const KNOWN_PLUGINS = ['cordova', 'proxy', 'ionic1', 'ionic-angular'];
export const ORG_PREFIX = '@ionic';
export const PLUGIN_PREFIX = 'cli-plugin-';
export const ERROR_PLUGIN_NOT_INSTALLED = 'PLUGIN_NOT_INSTALLED';
export const ERROR_PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND';
export const ERROR_PLUGIN_INVALID = 'PLUGIN_INVALID';

export function formatFullPluginName(name: string) {
  return `${ORG_PREFIX}/${PLUGIN_PREFIX}${name}`;
}

export async function loadPlugins(env: IonicEnvironment) {
  if (!env.project.directory) {
    return async (): Promise<void> => {};
  }

  const mPath = path.join(env.project.directory, 'node_modules', '@ionic');
  const ionicModules = await fsReadDir(mPath);

  const pluginPkgs = ionicModules
    .filter(pkgName => pkgName.indexOf(PLUGIN_PREFIX) === 0)
    .map(pkgName => `${ORG_PREFIX}/${pkgName}`);

  const plugins = await Promise.all(
    pluginPkgs.map(pkgName => {
      return loadPlugin(env.project.directory, pkgName, { askToInstall: false });
    })
  );

  const project = await env.project.load();
  const projectPlugin = formatFullPluginName(project.type);

  // TODO: remember the responses of the requests below

  if (!pluginPkgs.includes(projectPlugin)) {
    try {
      await loadPlugin(env.project.directory, projectPlugin, {
        askToInstall: true,
        message: `The type of this Ionic project is '${chalk.bold(project.type)}', but the plugin ${chalk.green(projectPlugin)} is not installed. Would you like to install it and continue?`,
      });
    } catch (e) {
      if (e !== ERROR_PLUGIN_NOT_INSTALLED) {
        throw e;
      }
    }
  }

  const proxyPluginPkg = formatFullPluginName('proxy');
  const [ , proxyVar ] = getGlobalProxy();
  if (proxyVar && !pluginPkgs.includes(proxyPluginPkg)) {
    try {
      await loadPlugin(env.project.directory, proxyPluginPkg, {
        askToInstall: true,
        message: `'${chalk.green(proxyVar)}' environment variable detected, but the plugin ${chalk.green(proxyPluginPkg)} is required to proxy requests. Would you like to install it and continue?`,
      });
    } catch (e) {
      if (e !== ERROR_PLUGIN_NOT_INSTALLED) {
        throw e;
      }
    }
  }

  for (let plugin of plugins) {
    const ns = plugin.namespace;

    if (ns) {
      env.namespace.namespaces.set(ns.name, () => ns);
    }

    if (plugin.registerHooks) {
      plugin.registerHooks(env.hooks);
    }
  }
}

export async function loadPlugin(projectDir: string, pluginName: string, { message, askToInstall = true }: { message?: string, askToInstall?: boolean }): Promise<Plugin> {
  let m: Plugin | undefined;

  if (!message) {
    message = `The plugin ${chalk.green(pluginName)} is not installed. Would you like to install it and continue?`;
  }

  try {
    const mPath = path.join(projectDir, 'node_modules', ...pluginName.split('/'));
    m = require(mPath);
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }

    // Unfortunately we need to check not only the code but the error message
    let foundPackageNeeded = KNOWN_PLUGINS.map(kp => formatFullPluginName(kp))
      .find(kp => e.message && e.message.includes(kp));
    if (!foundPackageNeeded) {
      throw `Dependency missing for ${chalk.bold(pluginName)}:\n\n  ${chalk.red('[ERROR]')}: ${e.message}`;
    }
  }
  if (!m && !askToInstall) {
    throw ERROR_PLUGIN_NOT_INSTALLED;
  }
  if (!m) {
    const inquirer = load('inquirer');
    const answers = await inquirer.prompt([{
      type: 'confirm',
      name: 'installPlugin',
      message,
    }]);

    if (answers['installPlugin']) {
      const releaseChannelName = await getReleaseChannelName();
      const pluginInstallVersion = `${pluginName}` + (releaseChannelName ? `@${releaseChannelName}` : '');
      const tasks = new TaskChain();

      tasks.next(`Executing npm command: ${chalk.bold(`npm install --save-dev ${pluginInstallVersion}`)}`);
      await new Shell().run('npm', ['install', '--save-dev', pluginInstallVersion ], {});
      tasks.end();

      return loadPlugin(projectDir, pluginName, { askToInstall });
    } else {
      throw ERROR_PLUGIN_NOT_INSTALLED;
    }
  }

  return m;
}

export async function getReleaseChannelName(): Promise<string | undefined> {
  let jsonStructure: any;
  const filePath = path.resolve(__dirname, '..', '..', 'package.json');
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
