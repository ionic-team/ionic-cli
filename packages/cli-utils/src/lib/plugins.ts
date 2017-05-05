import * as path from 'path';
import * as chalk from 'chalk';

import { IonicEnvironment, Plugin } from '../definitions';
import { PROJECT_TYPES_PRETTY } from './project';
import { load } from './modules';
import { readDir } from './utils/fs';
import { getGlobalProxy } from './http';
import { PkgInstallOptions, pkgInstall } from './utils/npm';

export const KNOWN_PLUGINS = ['cordova', 'proxy', 'ionic1', 'ionic-angular'];
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
    message = `Looks like this is an ${PROJECT_TYPES_PRETTY.get(project.type)} project, would you like to install ${chalk.green(projectPlugin)} and continue?`;
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

  // TODO: remember the responses of the requests below

  const project = await env.project.load();
  const projectPlugin = formatFullPluginName(project.type);

  if (!pluginPkgs.includes(projectPlugin)) {
    const plugin = await promptToInstallProjectPlugin(env, {});

    if (plugin) {
      plugins.push(plugin);
    }
  }

  const proxyPluginPkg = formatFullPluginName('proxy');
  const [ , proxyVar ] = getGlobalProxy();
  if (proxyVar && !pluginPkgs.includes(proxyPluginPkg)) {
    const plugin = await promptToInstallPlugin(env, proxyPluginPkg, {
      message: `Detected '${chalk.green(proxyVar)}' in environment, but to proxy CLI requests, you'll need ${chalk.green(proxyPluginPkg)}. Would you like to install it and continue?`,
    });

    if (plugin) {
      plugins.push(plugin);
    }
  }

  for (let plugin of plugins) {
    installPlugin(env, plugin);
  }
}

export async function loadPlugin(env: IonicEnvironment, pluginName: string, { message, askToInstall = true, reinstall = false }: { message?: string, askToInstall?: boolean, reinstall?: boolean }): Promise<Plugin> {
  let m: Plugin | undefined;

  if (!message) {
    message = `The plugin ${chalk.green(pluginName)} is not installed. Would you like to install it and continue?`;
  }

  try {
    const mPath = require.resolve(path.join(env.project.directory, 'node_modules', ...pluginName.split('/')));
    delete require.cache[mPath];
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
  if (!m || reinstall) {
    const answers = await env.prompt([{
      type: 'confirm',
      name: 'installPlugin',
      message,
    }]);

    if (answers['installPlugin']) {
      await pkgInstallPlugin(env, pluginName);
      return loadPlugin(env, pluginName, { askToInstall });
    } else {
      throw ERROR_PLUGIN_NOT_INSTALLED;
    }
  }

  return m;
}

export async function checkForUpdates(env: IonicEnvironment): Promise<string[]> {
  const updates: string[] = [];
  let warnonly = false;

  const semver = load('semver');

  const ionicLatestVersion = await getLatestPluginVersion(env, env.plugins.ionic);
  const ionicDistTag = getReleaseChannelName(env.plugins.ionic.version);

  if (semver.gt(ionicLatestVersion, env.plugins.ionic.version)) {
    env.log.warn(`The Ionic CLI has an update available! Please upgrade (you might need ${chalk.green('sudo')}):\n\n    ${chalk.green('npm install -g ionic@' + ionicDistTag)}\n\n`);
    warnonly = true;
    updates.push(env.plugins.ionic.name);
  }

  for (let pluginName in env.plugins) {
    if (pluginName !== 'ionic') {
      const plugin = env.plugins[pluginName];
      const distTag = getReleaseChannelName(plugin.version);

      if (ionicDistTag === distTag) {
        const latestVersion = await getLatestPluginVersion(env, plugin);

        if (semver.gt(latestVersion, plugin.version) || (ionicDistTag === 'canary' && latestVersion !== plugin.version)) {
          updates.push(pluginName);

          if (warnonly) {
            env.log.warn(`Locally installed CLI Plugin ${chalk.green(plugin.name + '@' + chalk.bold(plugin.version))} has an update available (${chalk.green.bold(latestVersion)})! Please upgrade:\n\n    ${chalk.green('npm install --save-dev ' + plugin.name + '@' + distTag)}\n\n`);
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
        env.log.warn(`Locally installed CLI Plugin ${chalk.green(plugin.name + chalk.bold('@' + distTag))} has a different distribution tag than the Ionic CLI (${chalk.green.bold('@' + ionicDistTag)}).\n` +
                     `Please install the matching plugin version:\n\n    ${chalk.green('npm install --save-dev ' + plugin.name + '@' + ionicDistTag)}\n\n`);
        updates.push(pluginName);
      }
    }
  }

  return updates;
}

export async function getLatestPluginVersion(env: IonicEnvironment, plugin: Plugin): Promise<string> {
  const distTag = getReleaseChannelName(plugin.version);

  if (distTag === 'local') {
    return plugin.version;
  }

  env.log.debug(`Checking for latest plugin version of ${chalk.bold(plugin.name + '@' + distTag)}.`);

  // TODO: might belong in utils/npm.ts
  const cmdResult = await env.shell.run('npm', ['view', plugin.name, `dist-tags.${distTag}`, '--json'], { showCommand: false });
  env.log.debug(`Latest version of ${chalk.bold(plugin.name + '@' + distTag)} is ${cmdResult}.`);
  const latestVersion = JSON.parse(cmdResult);

  if (!latestVersion) {
    return plugin.version;
  }

  return latestVersion.trim();
}

export async function pkgInstallPlugin(env: IonicEnvironment, name: string, options: PkgInstallOptions = {}) {
  const releaseChannelName = getReleaseChannelName(env.plugins.ionic.version);
  let pluginInstallVersion = `${name}@${releaseChannelName}`;

  if (releaseChannelName === 'local') {
    options.link = true;
    pluginInstallVersion = name;
  }

  await pkgInstall(env, pluginInstallVersion, options);
}

export function getReleaseChannelName(version: string): 'local' | 'canary' | 'beta' | 'latest' {
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
