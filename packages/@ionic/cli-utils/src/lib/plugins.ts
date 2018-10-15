import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

import { DistTag, IonicEnvironment, Plugin, PluginMeta } from '../definitions';
import { isPlugin } from '../guards';
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

export async function detectAndWarnAboutDeprecatedPlugin(env: IonicEnvironment, plugin: string) {
  const packageJson = await env.project.loadPackageJson();

  if (packageJson.devDependencies && packageJson.devDependencies[plugin]) {
    const { pkgManagerArgs } = await import('../lib/utils/npm');
    const args = await pkgManagerArgs(env, { pkg: plugin, command: 'uninstall', saveDev: true });

    env.log.warn(
      `Detected ${chalk.bold(plugin)} in your ${chalk.bold('package.json')}.\n` +
      `As of CLI 3.8, it is no longer needed. You can uninstall it:\n\n${chalk.green(args.join(' '))}\n`
    );
  }
}
