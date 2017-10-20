import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

import { DistTag, IonicEnvironment, Plugin, PluginMeta } from '../definitions';
import { isPlugin } from '../guards';
import { FatalException } from './errors';
import { pathAccessible, pathExists } from '@ionic/cli-framework/utils/fs';
import { getGlobalProxy } from './utils/http';
import { PkgManagerOptions, pkgManagerArgs, readPackageJsonFileOfResolvedModule } from './utils/npm';

export const ERROR_PLUGIN_NOT_INSTALLED = 'PLUGIN_NOT_INSTALLED';
export const ERROR_PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND';
export const ERROR_PLUGIN_INVALID = 'PLUGIN_INVALID';

export const KNOWN_PLUGINS = ['proxy'];
const ORG_PREFIX = '@ionic';
const PLUGIN_PREFIX = 'cli-plugin-';

export function formatFullPluginName(name: string) {
  return `${ORG_PREFIX}/${PLUGIN_PREFIX}${name}`;
}

export async function promptToInstallPlugin(env: IonicEnvironment, pluginName: string, { message, global = false, reinstall = false }: { message?: string, global?: boolean; reinstall?: boolean }) {
  if (!global && !env.project.directory) {
    return;
  }

  try {
    return await loadPlugin(env, pluginName, {
      askToInstall: true,
      global,
      reinstall,
      message,
    });
  } catch (e) {
    if (e !== ERROR_PLUGIN_NOT_INSTALLED) {
      throw e;
    }
  }
}

export function registerPlugin(env: IonicEnvironment, plugin: Plugin) {
  if (plugin.registerHooks) { // TODO unnecessary if-statement?
    plugin.registerHooks(env.hooks);
  }

  env.plugins[plugin.meta.name] = plugin;
}

export function unregisterPlugin(env: IonicEnvironment, plugin: Plugin) {
  env.hooks.deleteSource(plugin.meta.name);

  delete env.plugins[plugin.meta.name];
}

export async function loadPlugins(env: IonicEnvironment) {
  const global = !env.meta.local;

  const modulesDir = path.resolve(global ? path.dirname(path.dirname(path.dirname(env.meta.libPath))) : path.join(env.project.directory, 'node_modules'));
  const pluginPkgs = await Promise.all(KNOWN_PLUGINS
    .map(formatFullPluginName)
    .map(async (pkgName): Promise<[string, boolean]> => {
      const pluginPath = path.resolve(modulesDir, path.normalize(pkgName));
      const exists = await pathExists(pluginPath);
      return [pkgName, exists];
    }));

  const [ , proxyVar ] = getGlobalProxy();

  if (proxyVar) {
    const proxyPluginPkg = formatFullPluginName('proxy');
    env.log.debug(() => `Detected ${chalk.green(proxyVar)} in environment`);

    if (!pluginPkgs.find(v => v[0] === proxyPluginPkg && v[1])) {
      const canInstall = await pathAccessible(env.plugins.ionic.meta.filePath, fs.constants.W_OK);
      const proxyInstallArgs = await pkgManagerArgs(env, { pkg: proxyPluginPkg, global });
      const installMsg = `Detected ${chalk.green(proxyVar)} in environment, but to proxy CLI requests, you'll need ${chalk.cyan(proxyPluginPkg)} installed.`;

      if (canInstall) {
        await promptToInstallPlugin(env, proxyPluginPkg, {
          message: `${installMsg} Install now?`,
          reinstall: true,
          global,
        });
      } else {
        env.log.warn(`${installMsg}\nYou can install it manually:\n\n${chalk.green(proxyInstallArgs.join(' '))}\n`);
      }
    }
  }


  const pluginPromises = pluginPkgs.map(async (pkg) => {
    const [ pkgName, exists ] = pkg;

    if (exists) {
      try {
        return await loadPlugin(env, pkgName, { askToInstall: false, global });
      } catch (e) {
        if (e !== ERROR_PLUGIN_INVALID) {
          throw e;
        }
      }
    }
  });

  for (let p of pluginPromises) {
    const plugin = await p;

    if (plugin) {
      registerPlugin(env, plugin);
    }
  }
}

export interface LoadPluginOptions {
  message?: string;
  askToInstall?: boolean;
  reinstall?: boolean;
  global?: boolean;
}

export async function loadPlugin(env: IonicEnvironment, pluginName: string, { message, askToInstall = true, reinstall = false, global = false }: LoadPluginOptions): Promise<Plugin> {
  const config = await env.config.load();

  const modulesDir = path.resolve(global ? path.dirname(path.dirname(path.dirname(env.meta.libPath))) : path.join(env.project.directory, 'node_modules'));
  let mResolvedPath: string | undefined;
  let m: Plugin | undefined;

  if (!message) {
    message = `The plugin ${chalk.cyan(pluginName)} is not installed. Would you like to install it and continue?`;
  }

  env.log.debug(() => `Loading ${global ? 'global' : 'local'} plugin ${chalk.bold(pluginName)}`);

  try {
    mResolvedPath = require.resolve(path.resolve(modulesDir, pluginName));
    delete require.cache[mResolvedPath];
    m = require(mResolvedPath);
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }

    if (!askToInstall) {
      env.log.debug(() => `${chalk.red(ERROR_PLUGIN_NOT_INSTALLED)}: ${global ? 'global' : 'local'} ${chalk.bold(pluginName)}`);
      throw ERROR_PLUGIN_NOT_INSTALLED;
    }
  }

  if (!m || reinstall) {
    const confirm = await env.prompt({
      type: 'confirm',
      name: 'confirm',
      message,
    });

    if (confirm) {
      const [ installer, ...installerArgs ] = await pkgInstallPluginArgs(env, pluginName, { global });
      await env.shell.run(installer, installerArgs, {});
      m = await loadPlugin(env, pluginName, { askToInstall: false, global });
      mResolvedPath = require.resolve(path.resolve(modulesDir, pluginName));
    } else {
      config.state.lastNoResponseToUpdate = new Date().toISOString();
      throw ERROR_PLUGIN_NOT_INSTALLED;
    }
  }

  if (m.version || !isPlugin(m) || !mResolvedPath) { // m.version means old-style plugins, so not loading
    env.log.debug(() => `${chalk.red(ERROR_PLUGIN_INVALID)}: ${global ? 'global' : 'local'} ${chalk.bold(pluginName)}`);
    throw ERROR_PLUGIN_INVALID;
  }

  const meta = await getPluginMeta(mResolvedPath);
  m.meta = meta;

  if (config.daemon.updates) {
    const latestVersion = await getLatestPluginVersion(env, meta.name, meta.version);
    env.log.debug(() => `Latest plugin version of ${chalk.bold(meta.name + (meta.distTag === 'latest' ? '' : '@' + meta.distTag))} is ${chalk.bold(latestVersion || 'unknown')}, according to daemon file.`);

    m.meta.latestVersion = latestVersion;
    m.meta.updateAvailable = latestVersion ? await versionNeedsUpdating(meta.version, latestVersion) : undefined;
  }

  return m;
}

export async function getPluginMeta(p: string): Promise<PluginMeta> {
  const packageJson = await readPackageJsonFileOfResolvedModule(p);

  const name = packageJson.name;
  const version = packageJson.version || '';
  const distTag = determineDistTag(version);

  return {
    distTag,
    filePath: p,
    name,
    version,
  };
}

export async function versionNeedsUpdating(version: string, latestVersion: string): Promise<boolean> {
  const semver = await import('semver');
  const distTag = determineDistTag(version);

  return semver.gt(latestVersion, version) || (['canary', 'testing'].includes(distTag) && latestVersion !== version);
}

async function facilitateIonicUpdate(env: IonicEnvironment, ionicPlugin: Plugin, latestVersion: string) {
  const config = await env.config.load();

  const global = !env.meta.local;
  const ionicInstallArgs = await pkgInstallPluginArgs(env, 'ionic', { global });
  const updateMsg = `The Ionic CLI ${global ? '' : '(local version) '}has an update available (${chalk.cyan(ionicPlugin.meta.version)} => ${chalk.cyan(latestVersion)})!`;
  const canInstall = global ? await pathAccessible(ionicPlugin.meta.filePath, fs.constants.W_OK) : true;

  if (canInstall) {
    const confirm = await env.prompt({
      name: 'confirm',
      type: 'confirm',
      message: `${updateMsg} Would you like to install it?`,
    });

    if (confirm) {
      const [ installer, ...installerArgs ] = ionicInstallArgs;
      await env.shell.run(installer, installerArgs, {});
      const revertArgs = await pkgManagerArgs(env, { pkg: `ionic@${ionicPlugin.meta.version}`, global });
      env.log.nl();
      env.log.ok(`Updated Ionic CLI to ${chalk.bold(latestVersion)}! 🎉`);
      env.log.nl();
      env.log.msg(chalk.bold('Please re-run your command.'));
      env.log.nl();
      throw new FatalException(`${chalk.bold('Note')}: You can downgrade to your old version by running: ${chalk.green(revertArgs.join(' '))}`, 0);
    } else {
      config.state.lastNoResponseToUpdate = new Date().toISOString();
      env.log.info(`Not automatically updating your CLI.`);
    }
  } else {
    env.log.info(updateMsg);
    env.log.nl();
    env.log.warn(
      `No write permissions for ${global ? 'global' : 'local'} ${chalk.bold('node_modules')}--automatic CLI updates are disabled.\n` +
      `To fix, see ${chalk.bold('https://docs.npmjs.com/getting-started/fixing-npm-permissions')}\n\n` +
      `Or, install the CLI update manually:\n\n${chalk.green(ionicInstallArgs.join(' '))}\n`
    );
  }
}

async function facilitatePluginUpdate(env: IonicEnvironment, ionicPlugin: Plugin, plugin: Plugin, latestVersion: string): Promise<boolean> {
  const global = !env.meta.local;
  const startMsg = `${global ? 'Global' : 'Local'} plugin ${chalk.cyan(plugin.meta.name)}`;
  const updateMsg = `${startMsg} has an update available (${chalk.cyan(plugin.meta.version)} => ${chalk.cyan(latestVersion)})!`;
  const canInstall = global ? await pathAccessible(plugin.meta.filePath, fs.constants.W_OK) : true;

  if (canInstall) {
    const message = ionicPlugin.meta.distTag === plugin.meta.distTag ?
      `${updateMsg} Would you like to install it?` :
      `${startMsg} has a different dist-tag (${chalk.cyan('@' + plugin.meta.distTag)}) than the Ionic CLI (${chalk.cyan('@' + ionicPlugin.meta.distTag)}). Would you like to install the appropriate plugin version?`;

    const okmessage = ionicPlugin.meta.distTag === plugin.meta.distTag ?
      `Updated ${chalk.bold(plugin.meta.name)} to ${chalk.bold(latestVersion)}! 🎉` :
      `Installed ${chalk.bold(plugin.meta.name + '@' + ionicPlugin.meta.distTag)}`;

    const p = await promptToInstallPlugin(env, plugin.meta.name, {
      message,
      reinstall: true,
      global,
    });

    if (p) {
      unregisterPlugin(env, plugin);
      registerPlugin(env, p);
      env.log.ok(okmessage);
      return true;
    }

    env.log.info(`Not automatically updating ${chalk.bold(plugin.meta.name)}.`);
  } else {
    env.log.info(updateMsg);
    env.log.nl();
    env.log.warn(
      `No write permissions for ${global ? 'global' : 'local'}${chalk.bold('node_modules')}--automatic plugin updates are disabled.\n` +
      `To fix, see ${chalk.bold('https://docs.npmjs.com/getting-started/fixing-npm-permissions')}\n`
    );
  }

  return false;
}

export async function checkForUpdates(env: IonicEnvironment): Promise<string[]> {
  const [ config, ] = await Promise.all([env.config.load(), env.daemon.load()]);

  if (!config.daemon.updates) {
    return [];
  }

  await env.daemon.save();

  if (env.plugins.ionic.meta.updateAvailable && env.plugins.ionic.meta.latestVersion) {
    await facilitateIonicUpdate(env, env.plugins.ionic, env.plugins.ionic.meta.latestVersion);
  }

  const values = await import('lodash/values');
  const plugins = values(env.plugins).filter(p => p !== env.plugins.ionic);
  const updates: string[] = [];

  for (let plugin of plugins) {
    // TODO: differing dist-tags?
    if (await env.config.isUpdatingEnabled() && plugin.meta.updateAvailable && plugin.meta.latestVersion) {
      const installed = await facilitatePluginUpdate(env, env.plugins.ionic, plugin, plugin.meta.latestVersion);

      if (installed) {
        updates.push(plugin.meta.name);
      }
    }
  }

  if (updates.length > 0) {
    const [ installer, ...dedupeArgs ] = await pkgManagerArgs(env, { command: 'dedupe' });

    if (dedupeArgs.length > 0) {
      try {
        await env.shell.run(installer, dedupeArgs, { fatalOnError: false });
      } catch (e) {
        env.log.warn('Error while deduping npm dependencies. Attempting to continue...');
      }
    }
  }

  return updates;
}

export async function getLatestPluginVersion(env: IonicEnvironment, name: string, version: string): Promise<string | undefined> {
  const daemon = await env.daemon.load();
  const distTag = determineDistTag(version);

  if (typeof daemon.latestVersions[distTag] === 'object') {
    if (daemon.latestVersions[distTag][name]) {
      const version = daemon.latestVersions[distTag][name];
      return version;
    }
  } else {
    env.daemon.populateDistTag(distTag);
  }
}

export async function pkgInstallPluginArgs(env: IonicEnvironment, name: string, options: PkgManagerOptions = {}): Promise<string[]> {
  const releaseChannelName = determineDistTag(env.plugins.ionic.meta.version);
  let pluginInstallVersion = `${name}@${releaseChannelName}`;

  options.pkg = pluginInstallVersion;
  options.saveDev = true;

  return pkgManagerArgs(env, options);
}

export function determineDistTag(version: string): DistTag {
  if (version.includes('-alpha')) {
    return 'canary';
  }

  if (version.includes('-testing')) {
    return 'testing';
  }

  return 'latest';
}
