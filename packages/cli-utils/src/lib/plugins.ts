import * as path from 'path';
import * as chalk from 'chalk';

import { DistTag, IonicEnvironment, Plugin, PluginInfo } from '../definitions';
import { isPlugin } from '../guards';
import { load } from './modules';
import { readDir } from './utils/fs';
import { getGlobalProxy } from './http';
import { PkgInstallOptions, pkgInstall } from './utils/npm';

export const KNOWN_PLUGINS = ['cordova', 'ionic1', 'ionic-angular'];
export const KNOWN_GLOBAL_PLUGINS = ['proxy'];
export const ORG_PREFIX = '@ionic';
export const PLUGIN_PREFIX = 'cli-plugin-';
export const ERROR_PLUGIN_NOT_INSTALLED = 'PLUGIN_NOT_INSTALLED';
export const ERROR_PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND';
export const ERROR_PLUGIN_INVALID = 'PLUGIN_INVALID';

export function formatFullPluginName(name: string) {
  return `${ORG_PREFIX}/${PLUGIN_PREFIX}${name}`;
}

export async function promptToInstallProjectPlugin(env: IonicEnvironment, { message }: { message?: string }) {
  const project = await env.project.load();
  const projectPlugin = formatFullPluginName(project.type);

  if (!message) {
    message = `Looks like this is an ${env.project.formatType(project.type)} project, would you like to install ${chalk.green(projectPlugin)} and continue?`;
  }

  return await promptToInstallPlugin(env, projectPlugin, { message });
}

export async function promptToInstallPlugin(env: IonicEnvironment, pluginName: string, { message, reinstall = false }: { message?: string, reinstall?: boolean }) {
  if (!env.project.directory) {
    return;
  }

  try {
    return await loadPlugin(env, pluginName, {
      askToInstall: true,
      reinstall,
      message,
    });
  } catch (e) {
    if (e !== ERROR_PLUGIN_NOT_INSTALLED) {
      throw e;
    }
  }
}

export function installPlugin(env: IonicEnvironment, plugin: Plugin) {
  const ns = plugin.namespace;

  if (ns) {
    env.namespace.namespaces.set(ns.name, () => ns);
  }

  if (plugin.registerHooks) {
    plugin.registerHooks(env.hooks);
  }

  env.plugins[plugin.name] = plugin;
}

export function uninstallPlugin(env: IonicEnvironment, plugin: Plugin) {
  if (plugin.namespace) {
    env.namespace.namespaces.delete(plugin.namespace.name);
  }

  env.hooks.deleteSource(plugin.name);

  delete env.plugins[plugin.name];
}

export async function loadPlugins(env: IonicEnvironment) {
  // GLOBAL PLUGINS
  const globalPluginPkgs = KNOWN_GLOBAL_PLUGINS.map(formatFullPluginName);
  const globalPluginPromises = globalPluginPkgs.map(async (pkgName) => {
    try {
      return await loadPlugin(env, pkgName, { askToInstall: false, global: true });
    } catch (e) {
      if (e !== ERROR_PLUGIN_NOT_INSTALLED) {
        throw e;
      }
    }
  });

  for (let p of globalPluginPromises) {
    const plugin = await p;

    if (plugin) {
      installPlugin(env, plugin);
    }
  }

  const proxyPluginPkg = formatFullPluginName('proxy');
  const [ , proxyVar ] = getGlobalProxy();
  if (proxyVar && !(proxyPluginPkg in env.plugins)) {
    env.log.warn(
      `Detected ${chalk.green(proxyVar)} in environment, but to proxy CLI requests,\n` +
      `you'll need ${chalk.green(proxyPluginPkg)} installed globally:\n\n` +
      `    ${chalk.green('npm install -g ' + proxyPluginPkg)}\n`
    );
  }

  if (!env.project.directory) {
    return;
  }

  // LOCAL PLUGINS

  const mPath = path.join(env.project.directory, 'node_modules', '@ionic');
  const ionicModules = await readDir(mPath);

  const pluginPkgs = ionicModules
    .filter(pkgName => pkgName.indexOf(PLUGIN_PREFIX) === 0)
    .map(pkgName => `${ORG_PREFIX}/${pkgName}`);

  const plugins: Plugin[] = [];
  const pluginPromises = pluginPkgs.map(pkgName => {
    return loadPlugin(env, pkgName, { askToInstall: false });
  });

  for (let p of pluginPromises) {
    const plugin = await p;
    plugins.push(plugin);
  }

  // TODO: remember the responses of the requests below

  const project = await env.project.load();
  const projectPlugin = formatFullPluginName(project.type);

  if (!pluginPkgs.includes(projectPlugin)) {
    const plugin = await promptToInstallProjectPlugin(env, {});

    if (plugin) {
      plugins.push(plugin);
    }
  }

  for (let plugin of plugins) {
    installPlugin(env, plugin);
  }
}

export interface LoadPluginOptions {
  message?: string;
  askToInstall?: boolean;
  reinstall?: boolean;
  global?: boolean;
}

export async function loadPlugin(env: IonicEnvironment, pluginName: string, { message, askToInstall = true, reinstall = false, global = false }: LoadPluginOptions): Promise<Plugin> {
  let mPath: string | undefined;
  let m: Plugin | undefined;

  if (!message) {
    message = `The plugin ${chalk.green(pluginName)} is not installed. Would you like to install it and continue?`;
  }

  env.log.debug(`Load ${global ? 'global' : 'local'} plugin ${chalk.bold(pluginName)}`);

  try {
    mPath = require.resolve(global ? pluginName : path.join(env.project.directory, 'node_modules', ...pluginName.split('/')));
    delete require.cache[mPath];
    m = require(mPath);
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }

    if (!askToInstall) {
      env.log.debug(`Throwing ${chalk.red(ERROR_PLUGIN_NOT_INSTALLED)} for ${global ? 'global' : 'local'} ${chalk.bold(pluginName)}`);
      throw ERROR_PLUGIN_NOT_INSTALLED;
    }

    if (reinstall) {
      const confirm = await env.prompt({
        type: 'confirm',
        name: 'confirm',
        message,
      });

      if (confirm) {
        await pkgInstallPlugin(env, pluginName);
        return loadPlugin(env, pluginName, { askToInstall: false });
      } else {
        throw ERROR_PLUGIN_NOT_INSTALLED;
      }
    }
  }

  if (!isPlugin(m) || !mPath) {
    throw ERROR_PLUGIN_INVALID;
  }

  m.meta = {
    filePath: mPath,
  };

  return m;
}

export async function getPluginInfo(env: IonicEnvironment, plugin: Plugin): Promise<PluginInfo> {
  const semver = load('semver');

  const currentVersion = plugin.version;
  const latestVersion = await getLatestPluginVersion(env, plugin);
  const distTag = determineDistTag(currentVersion);

  return {
    distTag,
    currentVersion,
    latestVersion,
    updateAvailable: semver.gt(latestVersion, currentVersion) || (distTag === 'canary' && latestVersion !== currentVersion),
  };
}

export async function checkForUpdates(env: IonicEnvironment): Promise<string[]> {
  const updates: string[] = [];
  let warnonly = false;

  const ionicPluginInfo = await getPluginInfo(env, env.plugins.ionic);

  if (ionicPluginInfo.updateAvailable) {
    env.log.warn(`The Ionic CLI has an update available! Please upgrade (you might need ${chalk.green('sudo')}):\n\n    ${chalk.green('npm install -g ionic@' + ionicPluginInfo.distTag)}\n\n`);
    warnonly = true;
    updates.push(env.plugins.ionic.name);
  }

  for (let pluginName in env.plugins) {
    if (pluginName === 'ionic') {
      continue;
    }

    const plugin = env.plugins[pluginName];
    const pluginInfo = await getPluginInfo(env, plugin);

    if (plugin.preferGlobal) {
      if (ionicPluginInfo.distTag === pluginInfo.distTag) {
        const latestVersion = await getLatestPluginVersion(env, plugin);

        if (pluginInfo.updateAvailable) {
          env.log.warn(`Globally installed CLI Plugin ${chalk.green(plugin.name + '@' + chalk.bold(plugin.version))} has an update available (${chalk.green.bold(latestVersion)})! Please upgrade:\n\n    ${chalk.green('npm install -g ' + plugin.name + '@' + pluginInfo.distTag)}\n\n`);
        }
      } else {
        env.log.warn(`Globally installed CLI Plugin ${chalk.green(plugin.name + chalk.bold('@' + pluginInfo.distTag))} has a different dist-tag than the Ionic CLI (${chalk.green.bold('@' + ionicPluginInfo.distTag)}).\n` +
                     `Please install the matching plugin version:\n\n    ${chalk.green('npm install -g ' + plugin.name + '@' + ionicPluginInfo.distTag)}\n\n`);
      }
    } else {
      if (ionicPluginInfo.distTag === pluginInfo.distTag) {
        const latestVersion = await getLatestPluginVersion(env, plugin);

        if (pluginInfo.updateAvailable) {
          updates.push(pluginName);

          if (warnonly) {
            env.log.warn(`Locally installed CLI Plugin ${chalk.green(plugin.name + '@' + chalk.bold(plugin.version))} has an update available (${chalk.green.bold(latestVersion)})! Please upgrade:\n\n    ${chalk.green('npm install --save-dev ' + plugin.name + '@' + pluginInfo.distTag)}\n\n`);
          } else {
            const p = await promptToInstallPlugin(env, plugin.name, {
              message: `Locally installed CLI Plugin ${chalk.green(plugin.name + '@' + chalk.bold(plugin.version))} has an update available (${chalk.green.bold(latestVersion)})! Would you like to install it and continue?`,
              reinstall: true,
            });

            if (p) {
              uninstallPlugin(env, plugin);
              installPlugin(env, p);
            }
          }
        }
      } else {
        env.log.warn(`Locally installed CLI Plugin ${chalk.green(plugin.name + chalk.bold('@' + pluginInfo.distTag))} has a different dist-tag than the Ionic CLI (${chalk.green.bold('@' + ionicPluginInfo.distTag)}).\n` +
                     `Please install the matching plugin version:\n\n    ${chalk.green('npm install --save-dev ' + plugin.name + '@' + ionicPluginInfo.distTag)}\n\n`);
        updates.push(pluginName);
      }
    }
  }

  return updates;
}

export async function getLatestPluginVersion(env: IonicEnvironment, plugin: Plugin): Promise<string> {
  const distTag = determineDistTag(plugin.version);

  if (distTag === 'local') {
    return plugin.version;
  }

  env.log.debug(`Checking for latest plugin version of ${chalk.bold(plugin.name + '@' + distTag)}.`);

  // TODO: might belong in utils/npm.ts
  const cmdResult = await env.shell.run('npm', ['view', plugin.name, `dist-tags.${distTag}`, '--json'], { showCommand: false });
  env.log.debug(`Latest version of ${chalk.bold(plugin.name + '@' + distTag)} is ${cmdResult}.`);

  if (!cmdResult) {
    return plugin.version;
  }

  const latestVersion = JSON.parse(cmdResult);

  if (!latestVersion) {
    return plugin.version;
  }

  return latestVersion.trim();
}

export async function pkgInstallPlugin(env: IonicEnvironment, name: string, options: PkgInstallOptions = {}) {
  const releaseChannelName = determineDistTag(env.plugins.ionic.version);
  let pluginInstallVersion = `${name}@${releaseChannelName}`;

  if (releaseChannelName === 'local') {
    options.link = true;
    pluginInstallVersion = name;
  }

  await pkgInstall(env, pluginInstallVersion, options);
}

export function determineDistTag(version: string): DistTag {
  if (version.includes('-local')) {
    return 'local';
  }

  if (version.includes('-alpha')) {
    return 'canary';
  }

  if (version.includes('-beta') || version.includes('-rc')) {
    return 'beta';
  }

  return 'latest';
}
