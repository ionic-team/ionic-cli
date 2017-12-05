import * as path from 'path';

import chalk from 'chalk';

import { DistTag, IonicEnvironment, Plugin, PluginMeta } from '../definitions';
import { isPlugin } from '../guards';
import { pathExists } from '@ionic/cli-framework/utils/fs';
import { getGlobalProxy } from './utils/http';
import { pkgManagerArgs, readPackageJsonFileOfResolvedModule } from './utils/npm';

export const ERROR_PLUGIN_NOT_INSTALLED = 'PLUGIN_NOT_INSTALLED';
export const ERROR_PLUGIN_INVALID = 'PLUGIN_INVALID';

const KNOWN_PLUGINS = ['proxy'];
const ORG_PREFIX = '@ionic';
const PLUGIN_PREFIX = 'cli-plugin-';

export function formatFullPluginName(name: string) {
  return `${ORG_PREFIX}/${PLUGIN_PREFIX}${name}`;
}

export function registerPlugin(env: IonicEnvironment, plugin: Plugin) {
  if (plugin.registerHooks) {
    plugin.registerHooks(env.hooks);
  }

  env.plugins[plugin.meta.name] = plugin;
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
      const proxyInstallArgs = await pkgManagerArgs(env, { pkg: proxyPluginPkg, global });

      env.log.warn(
        `Detected ${chalk.green(proxyVar)} in environment, but to proxy CLI requests, you'll need ${chalk.cyan(proxyPluginPkg)} installed.\n` +
        `You can install it by running:\n\n${chalk.green(proxyInstallArgs.join(' '))}\n`
      );
    }
  }

  const pluginPromises = pluginPkgs.map(async (pkg) => {
    const [ pkgName, exists ] = pkg;

    if (exists) {
      try {
        return await loadPlugin(env, pkgName, { global });
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

export async function versionNeedsUpdating(version: string, latestVersion: string): Promise<boolean> {
  const semver = await import('semver');
  const distTag = determineDistTag(version);

  return semver.gt(latestVersion, version) || (['canary', 'testing'].includes(distTag) && latestVersion !== version);
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

export async function loadPlugin(env: IonicEnvironment, pluginName: string, { global = false }: { global: boolean; }): Promise<Plugin> {
  const modulesDir = path.resolve(global ? path.dirname(path.dirname(path.dirname(env.meta.libPath))) : path.join(env.project.directory, 'node_modules'));
  let mResolvedPath: string | undefined;
  let m: Plugin;

  env.log.debug(() => `Loading ${global ? 'global' : 'local'} plugin ${chalk.bold(pluginName)}`);

  try {
    mResolvedPath = require.resolve(path.resolve(modulesDir, pluginName));
    delete require.cache[mResolvedPath];
    m = require(mResolvedPath);
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }

    env.log.debug(() => `${chalk.red(ERROR_PLUGIN_NOT_INSTALLED)}: ${global ? 'global' : 'local'} ${chalk.bold(pluginName)}`);
    throw ERROR_PLUGIN_NOT_INSTALLED;
  }

  if (m.version || !isPlugin(m) || !mResolvedPath) { // m.version means old-style plugins, so not loading
    env.log.debug(() => `${chalk.red(ERROR_PLUGIN_INVALID)}: ${global ? 'global' : 'local'} ${chalk.bold(pluginName)}`);
    throw ERROR_PLUGIN_INVALID;
  }

  const meta = await getPluginMeta(mResolvedPath);
  m.meta = meta;

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
