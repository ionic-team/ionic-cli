import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';

import { DistTag, HydratedPlugin, IonicEnvironment, Plugin } from '../definitions';
import { isPlugin } from '../guards';
import { FatalException } from './errors';
import { prettyPath } from './utils/format';
import { pathAccessible, pathExists, readDir } from './utils/fs';
import { getGlobalProxy } from './http';
import { PkgManagerOptions, pkgLatestVersion, pkgManagerArgs } from './utils/npm';

export const KNOWN_COMMAND_PLUGINS = ['cordova'];
export const KNOWN_GLOBAL_PLUGINS = ['proxy'];
export const KNOWN_PROJECT_PLUGINS = ['ionic1', 'ionic-angular'];
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
  const ns = plugin.namespace;

  if (ns) {
    env.namespace.namespaces.set(ns.name, () => ns);
  }

  if (plugin.registerHooks) {
    plugin.registerHooks(env.hooks);
  }

  env.plugins[plugin.name] = plugin;
}

export function unregisterPlugin(env: IonicEnvironment, plugin: Plugin) {
  if (plugin.namespace) {
    env.namespace.namespaces.delete(plugin.namespace.name);
  }

  env.hooks.deleteSource(plugin.name);

  delete env.plugins[plugin.name];
}

export async function loadPlugins(env: IonicEnvironment) {
  // GLOBAL PLUGINS

  const global = !env.meta || !env.meta.local;
  const globalPluginPkgs = KNOWN_GLOBAL_PLUGINS.map(formatFullPluginName);
  const globalPluginPromises = globalPluginPkgs.map(async (pkgName) => {
    try {
      return await loadPlugin(env, pkgName, { askToInstall: false, global });
    } catch (e) {
      if (e !== ERROR_PLUGIN_NOT_INSTALLED) {
        throw e;
      }
    }
  });

  for (let p of globalPluginPromises) {
    const plugin = await p;

    if (plugin) {
      registerPlugin(env, plugin);
    }
  }

  const [ , proxyVar ] = getGlobalProxy();

  if (!env.project.directory) {
    return;
  }

  const project = await env.project.load();

  // LOCAL PLUGINS

  const ionicModulePath = path.join(env.project.directory, 'node_modules', 'ionic');
  const gulpFilePath = path.join(env.project.directory, project.gulpFile || 'gulpfile.js');
  const mPath = path.join(env.project.directory, 'node_modules', '@ionic');

  const [ ionicModuleExists, gulpFileExists, ionicModules ] = await Promise.all([
    pathExists(ionicModulePath),
    pathExists(gulpFilePath),
    readDir(mPath),
  ]);

  if (!ionicModuleExists) {
    // TODO: remove "starting with 3.6"
    env.log.warn(chalk.yellow(
      chalk.bold('No local CLI detected.\n') +
      'Starting with CLI 3.6, the CLI must be installed locally to use local CLI plugins.\n'
    ));

    const p = await promptToInstallPlugin(env, 'ionic', {
      message: 'Install now?',
    });

    if (p) {
      env.log.ok('Installed Ionic CLI locally!');
      env.log.nl();
      throw new FatalException(`${chalk.bold('Please re-run your command.')}`, 0);
    } else {
      env.log.warn('Not loading local CLI plugins in global mode. CLI functionality may be limited.');
      return;
    }
  }

  if (proxyVar) {
    const proxyPluginPkg = formatFullPluginName('proxy');
    env.log.debug(() => `Detected ${chalk.green(proxyVar)} in environment`);

    if (!(proxyPluginPkg in env.plugins)) {
      const meta = env.plugins.ionic.meta;

      if (!meta) {
        throw new FatalException(`${chalk.green('ionic')} missing meta information`);
      }

      const canInstall = await pathAccessible(meta.filePath, fs.constants.W_OK);
      const proxyInstallArgs = await pkgManagerArgs(env, { pkg: proxyPluginPkg, global });
      const installMsg = `Detected ${chalk.green(proxyVar)} in environment, but to proxy CLI requests, you'll need ${chalk.green(proxyPluginPkg)} installed.`;

      if (canInstall) {
        const p = await promptToInstallPlugin(env, proxyPluginPkg, {
          message: `${installMsg} Install now?`,
          reinstall: true,
          global,
        });

        if (p) {
          registerPlugin(env, p);
        }
      } else {
        env.log.warn(`${installMsg}\nYou can install it manually:\n\n${chalk.green(proxyInstallArgs.join(' '))}\n`);
      }
    }
  }

  const plugins: Plugin[] = [];
  const pluginPkgs = ionicModules
    .filter(pkgName => pkgName.indexOf(PLUGIN_PREFIX) === 0)
    .map(pkgName => `${ORG_PREFIX}/${pkgName}`)
    .filter(pkgName => !KNOWN_GLOBAL_PLUGINS.map(formatFullPluginName).includes(pkgName)); // already loaded these in global section above

  const gulpPluginPkg = formatFullPluginName('gulp');

  if (gulpFileExists) {
    env.log.debug(() => `Detected ${chalk.green(prettyPath(gulpFilePath))} in project directory`);

    if (!pluginPkgs.includes(gulpPluginPkg)) {
      const installMsg = `Detected ${chalk.green(prettyPath(gulpFilePath))} in project directory, but to integrate gulp with the CLI, you'll need to install ${chalk.green(gulpPluginPkg)}.`;
      const p = await promptToInstallPlugin(env, gulpPluginPkg, {
        message: `${installMsg} Install now?`,
        reinstall: true,
      });

      if (p) {
        plugins.push(p);
      }
    }
  }

  const pluginPromises = pluginPkgs.map(pkgName => {
    return loadPlugin(env, pkgName, { askToInstall: false });
  });

  for (let p of pluginPromises) {
    const plugin = await p;
    plugins.push(plugin);
  }

  // TODO: remember the responses of the requests below

  const projectPlugin = formatFullPluginName(project.type);

  if (!pluginPkgs.includes(projectPlugin)) {
    const plugin = await promptToInstallProjectPlugin(env, {});

    if (plugin) {
      plugins.push(plugin);
    }
  }

  for (let plugin of plugins) {
    registerPlugin(env, plugin);
  }

  validatePlugins(env);
}

export function validatePlugins(env: IonicEnvironment) {
  const projectPlugins = new Set(KNOWN_PROJECT_PLUGINS.map(formatFullPluginName));
  const installedPlugins = new Set(Object.keys(env.plugins));
  const installedProjectPlugins = new Set([...projectPlugins].filter(p => installedPlugins.has(p)));

  if (installedProjectPlugins.size === 0) {
    env.log.warn('You have no CLI project plugins installed. CLI functionality may be limited.');
  } else if (installedProjectPlugins.size > 1) {
    env.log.warn(`You have multiple CLI project plugins installed (${[...installedProjectPlugins].map(p => chalk.green(p)).join(', ')}). ${chalk.bold('Please make sure you have only one installed.')}`);
  }
}

export interface LoadPluginOptions {
  message?: string;
  askToInstall?: boolean;
  reinstall?: boolean;
  global?: boolean;
}

export async function loadPlugin(env: IonicEnvironment, pluginName: string, { message, askToInstall = true, reinstall = false, global = false }: LoadPluginOptions): Promise<Plugin> {
  const mPath = global ? pluginName : path.join(env.project.directory, 'node_modules', ...pluginName.split('/'));
  let mResolvedPath: string | undefined;
  let m: Plugin | undefined;

  if (!message) {
    message = `The plugin ${chalk.green(pluginName)} is not installed. Would you like to install it and continue?`;
  }

  env.log.debug(() => `Loading ${global ? 'global' : 'local'} plugin ${chalk.green(pluginName)}`);

  try {
    mResolvedPath = require.resolve(mPath);
    delete require.cache[mResolvedPath];
    m = require(mResolvedPath);
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }

    if (!askToInstall) {
      env.log.debug(() => `Throwing ${chalk.red(ERROR_PLUGIN_NOT_INSTALLED)} for ${global ? 'global' : 'local'} ${chalk.green(pluginName)}`);
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
      mResolvedPath = require.resolve(mPath);
    } else {
      throw ERROR_PLUGIN_NOT_INSTALLED;
    }
  }

  if (!isPlugin(m) || !mResolvedPath) {
    env.log.debug(() => `Throwing ${chalk.red(ERROR_PLUGIN_INVALID)} for ${global ? 'global' : 'local'} ${chalk.green(pluginName)}`);
    throw ERROR_PLUGIN_INVALID;
  }

  m.meta = {
    filePath: mResolvedPath,
  };

  return m;
}

async function hydratePlugin(env: IonicEnvironment, plugin: Plugin): Promise<HydratedPlugin> {
  env.log.debug(() => `Getting plugin info for ${chalk.green(plugin.name)}`);

  const currentVersion = plugin.version;
  const latestVersion = await getLatestPluginVersion(env, plugin);
  const distTag = determineDistTag(currentVersion);
  const meta = plugin.meta;

  if (!meta) {
    throw new FatalException(`${chalk.green(plugin.name)} missing meta information`);
  }

  return {
    ...plugin,
    meta,
    distTag,
    currentVersion,
    latestVersion,
    updateAvailable: await pluginHasUpdate(currentVersion, latestVersion),
  };
}

export async function pluginHasUpdate(currentVersion: string, latestVersion: string): Promise<boolean> {
  const semver = await import('semver');
  const distTag = determineDistTag(currentVersion);

  return semver.gt(latestVersion, currentVersion) || ('canary' === distTag && latestVersion !== currentVersion);
}

async function facilitateIonicUpdate(env: IonicEnvironment, ionicPlugin: HydratedPlugin) {
  const global = !env.meta || !env.meta.local;
  const ionicInstallArgs = await pkgInstallPluginArgs(env, 'ionic', { global });
  const updateMsg = `The Ionic CLI ${global ? '' : '(local version) '}has an update available (${chalk.green(ionicPlugin.currentVersion)} => ${chalk.green(ionicPlugin.latestVersion)})!`;
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
      const revertArgs = await pkgManagerArgs(env, { pkg: `ionic@${ionicPlugin.currentVersion}`, global });
      env.log.nl();
      env.log.ok(`Updated Ionic CLI to ${chalk.green(ionicPlugin.latestVersion)}! 🎉`);
      env.log.nl();
      env.log.msg(chalk.bold('Please re-run your command.'));
      env.log.nl();
      throw new FatalException(`${chalk.bold('Note')}: You can downgrade to your old version by running: ${chalk.green(revertArgs.join(' '))}`, 0);
    } else {
      env.log.info(`Not automatically updating your CLI. You can update manually:\n\n${chalk.green(ionicInstallArgs.join(' '))}\n`);
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

async function facilitatePluginUpdate(env: IonicEnvironment, ionicPlugin: HydratedPlugin, plugin: HydratedPlugin): Promise<boolean> {
  const global = !env.meta || !env.meta.local;
  const pluginInstallArgs = await pkgInstallPluginArgs(env, plugin.name, { global });
  const startMsg = `${global ? 'Global' : 'Local'} plugin ${chalk.green(plugin.name)}`;
  const updateMsg = `${startMsg} has an update available (${chalk.green(plugin.currentVersion)} => ${chalk.green(plugin.latestVersion)})!`;
  const canInstall = global ? await pathAccessible(plugin.meta.filePath, fs.constants.W_OK) : true;

  if (canInstall) {
    const message = ionicPlugin.distTag === plugin.distTag ?
      `${updateMsg} Would you like to install it?` :
      `${startMsg} has a different dist-tag (${chalk.green('@' + plugin.distTag)}) than the Ionic CLI (${chalk.green('@' + ionicPlugin.distTag)}). Would you like to install the appropriate plugin version?`;

    const okmessage = ionicPlugin.distTag === plugin.distTag ?
      `Updated ${chalk.green(plugin.name)} to ${chalk.green(plugin.latestVersion)}! 🎉` :
      `Installed ${chalk.green(plugin.name + '@' + ionicPlugin.distTag)}`;

    const p = await promptToInstallPlugin(env, plugin.name, {
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

    env.log.info(`Not automatically updating ${chalk.green(plugin.name)}. You can update manually:\n\n${chalk.green(pluginInstallArgs.join(' '))}\n`);
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

  const allPlugins = await Promise.all(Object.keys(env.plugins).map(n => hydratePlugin(env, env.plugins[n])));
  await env.daemon.save();

  const ionicPlugin = allPlugins.find(p => p.name === 'ionic');

  if (!ionicPlugin) {
    throw new FatalException('Ionic plugin not initialized.');
  }

  if (ionicPlugin.updateAvailable) {
    await facilitateIonicUpdate(env, ionicPlugin);
  }

  const plugins = allPlugins.filter(p => p.name !== 'ionic');
  const updates: string[] = [];

  for (let plugin of plugins) {
    if (plugin.updateAvailable || ionicPlugin.distTag !== plugin.distTag) {
      const installed = await facilitatePluginUpdate(env, ionicPlugin, plugin);

      if (installed) {
        updates.push(plugin.name);
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

async function getLatestPluginVersion(env: IonicEnvironment, plugin: Plugin): Promise<string> {
  const distTag = determineDistTag(plugin.version);

  if (distTag === 'local') {
    return plugin.version;
  }

  env.log.debug(() => `Checking for latest plugin version of ${chalk.green(plugin.name + '@' + distTag)}.`);

  const daemon = await env.daemon.load();

  if (typeof daemon.latestVersions[distTag] === 'object') {
    if (daemon.latestVersions[distTag][plugin.name]) {
      return daemon.latestVersions[distTag][plugin.name];
    }
  } else {
    env.daemon.populateDistTag(distTag);
  }

  let latestVersion = await pkgLatestVersion(env, plugin.name, distTag);

  if (!latestVersion) {
    latestVersion = plugin.version;
  }

  latestVersion = latestVersion.trim();
  env.log.debug(`Latest version of ${chalk.green(plugin.name + '@' + distTag)} is ${latestVersion}.`);
  daemon.latestVersions[distTag][plugin.name] = latestVersion;

  return latestVersion;
}

export async function pkgInstallPluginArgs(env: IonicEnvironment, name: string, options: PkgManagerOptions = {}): Promise<string[]> {
  const releaseChannelName = determineDistTag(env.plugins.ionic.version);
  let pluginInstallVersion = `${name}@${releaseChannelName}`;

  if (releaseChannelName === 'local') {
    options.link = true;
    pluginInstallVersion = name;
  }

  options.pkg = pluginInstallVersion;
  options.saveDev = true;

  return pkgManagerArgs(env, options);
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
