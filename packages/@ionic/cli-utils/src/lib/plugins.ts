import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';

import { compileNodeModulesPaths, resolve } from '@ionic/cli-framework/utils/npm';

import { DistTag, InfoItem, IonicEnvironment, LoadedPlugin, Plugin, PluginMeta } from '../definitions';
import { isPlugin } from '../guards';
import { getGlobalProxy } from './utils/http';
import { pkgManagerArgs, readPackageJsonFileOfResolvedModule } from './utils/npm';

const debug = Debug('ionic:cli-utils:lib:plugins');

export const ERROR_PLUGIN_NOT_INSTALLED = 'PLUGIN_NOT_INSTALLED';
export const ERROR_PLUGIN_INVALID = 'PLUGIN_INVALID';

const KNOWN_PLUGINS = ['proxy'];
const ORG_PREFIX = '@ionic';
const PLUGIN_PREFIX = 'cli-plugin-';

export function formatFullPluginName(name: string) {
  return `${ORG_PREFIX}/${PLUGIN_PREFIX}${name}`;
}

export function registerPlugin(env: IonicEnvironment, plugin: LoadedPlugin) {
  env.plugins[plugin.meta.pkg.name] = plugin;
}

export async function loadPlugins(env: IonicEnvironment) {
  const global = !env.meta.local;
  const config = await env.config.load();
  const { npmClient } = config;

  const pluginPkgs = KNOWN_PLUGINS
    .map(formatFullPluginName)
    .map((pkgName): [string, boolean] => {
      const exists = () => {
        try {
          if (global) {
            require.resolve(pkgName);
          } else {
            resolve(pkgName, { paths: compileNodeModulesPaths(env.project.directory) });
          }

          return true;
        } catch (e) {
          // ignore
        }

        return false;
      };

      return [ pkgName, exists() ];
    });

  const [ , proxyVar ] = getGlobalProxy();

  if (proxyVar) {
    const proxyPluginPkg = formatFullPluginName('proxy');
    debug(`Detected ${chalk.green(proxyVar)} in environment`);

    if (!pluginPkgs.find(v => v[0] === proxyPluginPkg && v[1])) {
      const proxyInstallArgs = await pkgManagerArgs({ npmClient, shell: env.shell }, { command: 'install', pkg: proxyPluginPkg, global });

      env.log.warn(
        `Detected ${chalk.green(proxyVar)} in environment, but to proxy CLI requests, you'll need ${chalk.cyan(proxyPluginPkg)} installed.\n` +
        `You can install it by running:\n\n${chalk.green(proxyInstallArgs.join(' '))}\n`
      );
    }
  }

  const pluginPromises = pluginPkgs.map(async pkg => {
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

  const infofns: (() => Promise<InfoItem[]>)[] = [];

  for (const p of pluginPromises) {
    const plugin = await p;

    if (plugin) {
      registerPlugin(env, plugin);

      if (plugin.getInfo) {
        infofns.push(plugin.getInfo);
      }
    }
  }

  const originalGetInfo = env.getInfo;

  env.getInfo = async (): Promise<InfoItem[]> => {
    const infos = lodash.flatten(await Promise.all(infofns.map(f => f())));

    return [...infos, ...await originalGetInfo()];
  };
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

export async function loadPlugin(env: IonicEnvironment, pluginName: string, { global = false }: { global: boolean; }): Promise<LoadedPlugin> {
  let mResolvedPath: string | undefined;
  let m: Plugin;

  debug(`Loading ${global ? 'global' : 'local'} plugin ${chalk.bold(pluginName)}`);

  try {
    mResolvedPath = global ? require.resolve(pluginName) : resolve(pluginName, { paths: compileNodeModulesPaths(env.project.directory) });
    delete require.cache[mResolvedPath];
    m = require(mResolvedPath);
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }

    debug(`${chalk.red(ERROR_PLUGIN_NOT_INSTALLED)}: ${global ? 'global' : 'local'} ${chalk.bold(pluginName)}`);
    throw ERROR_PLUGIN_NOT_INSTALLED;
  }

  if (m.version || !isPlugin(m) || !mResolvedPath) { // m.version means old-style plugins, so not loading
    debug(`${chalk.red(ERROR_PLUGIN_INVALID)}: ${global ? 'global' : 'local'} ${chalk.bold(pluginName)}`);
    throw ERROR_PLUGIN_INVALID;
  }

  const meta = await getPluginMeta(mResolvedPath);

  return { ...m, meta };
}

export async function getPluginMeta(p: string): Promise<PluginMeta> {
  const pkg = await readPackageJsonFileOfResolvedModule(p);
  const distTag = determineDistTag(pkg.version);

  return {
    distTag,
    filePath: p,
    pkg,
  };
}
