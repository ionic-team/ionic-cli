import * as path from 'path';
import * as chalk from 'chalk';

import { IonicEnvironment, Plugin } from '../definitions';
import { PROJECT_TYPES_PRETTY } from './project';
import { load } from './modules';
import { readDir } from './utils/fs';
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
  const ionicModules = await readDir(mPath);

  const pluginPkgs = ionicModules
    .filter(pkgName => pkgName.indexOf(PLUGIN_PREFIX) === 0)
    .map(pkgName => `${ORG_PREFIX}/${pkgName}`);

  const plugins = await Promise.all(
    pluginPkgs.map(pkgName => {
      return loadPlugin(env, pkgName, { askToInstall: false });
    })
  );

  const project = await env.project.load();
  const projectPlugin = formatFullPluginName(project.type);

  // TODO: remember the responses of the requests below

  if (!pluginPkgs.includes(projectPlugin)) {
    try {
      await loadPlugin(env, projectPlugin, {
        askToInstall: true,
        message: `Looks like this is an ${PROJECT_TYPES_PRETTY.get(project.type)} project, would you like to install ${chalk.green(projectPlugin)} and continue?`,
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
      await loadPlugin(env, proxyPluginPkg, {
        askToInstall: true,
        message: `Detected '${chalk.green(proxyVar)}' in environment, but to proxy CLI requests, you'll need ${chalk.green(proxyPluginPkg)}. Would you like to install it and continue?`,
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

export async function loadPlugin(env: IonicEnvironment, pluginName: string, { message, askToInstall = true }: { message?: string, askToInstall?: boolean }): Promise<Plugin> {
  let m: Plugin | undefined;

  if (!message) {
    message = `The plugin ${chalk.green(pluginName)} is not installed. Would you like to install it and continue?`;
  }

  try {
    const mPath = path.join(env.project.directory, 'node_modules', ...pluginName.split('/'));
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
      const pluginInstallVersion = `${pluginName}@${getReleaseChannelName(env)}`;
      await env.shell.run('npm', ['install', '--save-dev', pluginInstallVersion], {});

      return loadPlugin(env, pluginName, { askToInstall });
    } else {
      throw ERROR_PLUGIN_NOT_INSTALLED;
    }
  }

  return m;
}

export function getReleaseChannelName(env: IonicEnvironment): 'canary' | 'beta' | 'latest' {
  if (env.versions.cli.includes('alpha')) {
    return 'canary';
  }

  if (env.versions.cli.includes('beta')) {
    return 'beta';
  }

  return 'latest';
}
