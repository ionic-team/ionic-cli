import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';

import { DistTag, IonicEnvironment, Plugin, HydratedPlugin } from '../definitions';
import { isPlugin } from '../guards';
import { FatalException } from './errors';
import { load } from './modules';
import { prettyPath } from './utils/format';
import { readDir, pathAccessible, pathExists } from './utils/fs';
import { getGlobalProxy } from './http';
import { PkgInstallOptions, pkgInstallArgs } from './utils/npm';

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

  const [ , proxyVar ] = getGlobalProxy();

  if (proxyVar) {
    const proxyPluginPkg = formatFullPluginName('proxy');
    env.log.debug(`Detected ${chalk.green(proxyVar)} in environment`);

    if (!(proxyPluginPkg in env.plugins)) {
      const meta = env.plugins.ionic.meta;

      if (!meta) {
        throw new FatalException(`${chalk.green('ionic')} missing meta information`);
      }

      const canInstall = await pathAccessible(meta.filePath, fs.constants.W_OK);
      const proxyInstallArgs = await pkgInstallArgs(env, proxyPluginPkg, { global: true });
      const installMsg = `Detected ${chalk.green(proxyVar)} in environment, but to proxy CLI requests, you'll need ${chalk.green(proxyPluginPkg)} installed globally.`;

      if (canInstall) {
        const p = await promptToInstallPlugin(env, proxyPluginPkg, {
          message: `${installMsg} Install now?`,
          reinstall: true,
          global: true,
        });

        if (p) {
          installPlugin(env, p);
        }
      } else {
        env.log.warn(`${installMsg}\nYou can install it manually (you will likely need ${chalk.green('sudo')}):\n\n${chalk.green(proxyInstallArgs.join(' '))}\n`);
      }
    }
  }

  if (!env.project.directory) {
    return;
  }

  const project = await env.project.load();

  // LOCAL PLUGINS

  const gulpFilePath = path.join(env.project.directory, project.gulpFile || 'gulpfile.js');
  const mPath = path.join(env.project.directory, 'node_modules', '@ionic');

  const [ gulpFileExists, ionicModules ] = await Promise.all([
    pathExists(gulpFilePath),
    readDir(mPath),
  ]);

  const plugins: Plugin[] = [];
  const pluginPkgs = ionicModules
    .filter(pkgName => pkgName.indexOf(PLUGIN_PREFIX) === 0)
    .map(pkgName => `${ORG_PREFIX}/${pkgName}`);

  const gulpPluginPkg = formatFullPluginName('gulp');

  if (gulpFileExists) {
    env.log.debug(`Detected ${chalk.green(prettyPath(gulpFilePath))} in project directory`);

    if (!pluginPkgs.includes(gulpPluginPkg)) {
      const gulpPluginInstallArgs = await pkgInstallArgs(env, gulpPluginPkg, {});
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
    installPlugin(env, plugin);
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

  env.log.debug(`Loading ${global ? 'global' : 'local'} plugin ${chalk.green(pluginName)}`);

  try {
    mResolvedPath = require.resolve(mPath);
    delete require.cache[mResolvedPath];
    m = require(mResolvedPath);
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }

    if (!askToInstall) {
      env.log.debug(`Throwing ${chalk.red(ERROR_PLUGIN_NOT_INSTALLED)} for ${global ? 'global' : 'local'} ${chalk.green(pluginName)}`);
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
    env.log.debug(`Throwing ${chalk.red(ERROR_PLUGIN_INVALID)} for ${global ? 'global' : 'local'} ${chalk.green(pluginName)}`);
    throw ERROR_PLUGIN_INVALID;
  }

  m.meta = {
    filePath: mResolvedPath,
  };

  return m;
}

export async function hydratePlugin(env: IonicEnvironment, plugin: Plugin): Promise<HydratedPlugin> {
  const semver = load('semver');

  env.log.debug(`Getting plugin info for ${chalk.green(plugin.name)}`);

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
    updateAvailable: semver.gt(latestVersion, currentVersion) || (distTag === 'canary' && latestVersion !== currentVersion),
  };
}

async function facilitateIonicUpdate(env: IonicEnvironment, ionicPlugin: HydratedPlugin) {
  const ionicInstallArgs = await pkgInstallPluginArgs(env, 'ionic', { global: true });
  const updateMsg = `The Ionic CLI has an update available (${chalk.green(ionicPlugin.currentVersion)} => ${chalk.green(ionicPlugin.latestVersion)})!`;
  const canInstall = await pathAccessible(ionicPlugin.meta.filePath, fs.constants.W_OK);

  if (canInstall) {
    const confirm = await env.prompt({
      name: 'confirm',
      type: 'confirm',
      message: `${updateMsg} Would you like to install it?`,
      noninteractiveValue: '',
    });

    if (confirm) {
      const [ installer, ...installerArgs ] = ionicInstallArgs;
      await env.shell.run(installer, installerArgs, {});
      const revertArgs = await pkgInstallArgs(env, `ionic@${ionicPlugin.currentVersion}`, { global: true });
      env.log.nl();
      env.log.ok(`Upgraded Ionic CLI to ${chalk.green(ionicPlugin.latestVersion)}! 🎉`);
      env.log.nl();
      env.log.msg(chalk.bold('Please re-run your command.'));
      env.log.nl();
      throw new FatalException(`${chalk.bold('Note')}: You can downgrade to your old version by running: ${chalk.green(revertArgs.join(' '))}`, 0);
    } else {
      env.log.ok(`Not automatically updating your CLI. You can update manually:\n\n${chalk.green(ionicInstallArgs.join(' '))}\n`);
    }
  } else {
    env.log.info(updateMsg);
    env.log.nl();
    env.log.warn(
      `No write permissions for global ${chalk.bold('node_modules')}--automatic CLI updates are disabled.\n` +
      `To fix, see ${chalk.bold('https://docs.npmjs.com/getting-started/fixing-npm-permissions')}\n\n` +
      `Or, install the CLI update manually (you will likely need ${chalk.green('sudo')}):\n\n${chalk.green(ionicInstallArgs.join(' '))}\n`
    );
  }
}

async function facilitatePluginUpdate(env: IonicEnvironment, ionicPlugin: HydratedPlugin, plugin: HydratedPlugin): Promise<boolean> {
  const pluginInstallArgs = await pkgInstallPluginArgs(env, plugin.name, { global: plugin.preferGlobal });
  const startMsg = `${plugin.preferGlobal ? 'Global' : 'Local'} plugin ${chalk.green(plugin.name)}`;
  const updateMsg = `${startMsg} has an update available (${chalk.green(plugin.currentVersion)} => ${chalk.green(plugin.latestVersion)})!`;
  const canInstall = plugin.preferGlobal ? await pathAccessible(plugin.meta.filePath, fs.constants.W_OK) : true;

  if (canInstall) {
    const message = ionicPlugin.distTag === plugin.distTag ?
      `${updateMsg} Would you like to install it?` :
      `${startMsg} has a different dist-tag (${chalk.green('@' + plugin.distTag)}) than the Ionic CLI (${chalk.green('@' + ionicPlugin.distTag)}). Would you like to install the appropriate plugin version?`;

    const p = await promptToInstallPlugin(env, plugin.name, {
      message,
      reinstall: true,
      global: plugin.preferGlobal,
    });

    if (p) {
      uninstallPlugin(env, plugin);
      installPlugin(env, p);
      env.log.ok(`Upgraded ${chalk.green(plugin.name)} to ${chalk.green(plugin.latestVersion)}! 🎉`);
      return true;
    }

    env.log.ok(`Not automatically updating ${chalk.green(plugin.name)}. You can update manually:\n\n${chalk.green(pluginInstallArgs.join(' '))}\n`);
  } else {
    env.log.info(updateMsg);
    env.log.nl();
    env.log.warn(
      `No write permissions for global ${chalk.bold('node_modules')}--automatic global plugin updates are disabled.\n` +
      `To fix, see ${chalk.bold('https://docs.npmjs.com/getting-started/fixing-npm-permissions')}\n`
    );
  }

  return false;
}

export async function checkForUpdates(env: IonicEnvironment): Promise<string[]> {
  const allPlugins = await Promise.all(Object.keys(env.plugins).map(n => hydratePlugin(env, env.plugins[n])));
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

  return updates;
}

async function getLatestPluginVersion(env: IonicEnvironment, plugin: Plugin): Promise<string> {
  let cmdResult, latestVersion: string | undefined;
  const config = await env.config.load();
  const distTag = determineDistTag(plugin.version);

  if ((plugin.name === 'ionic' && config.cliFlags['dev-always-ionic-updates']) || (plugin.name !== 'ionic' && config.cliFlags['dev-always-plugin-updates'])) {
    return '999.999.999';
  }

  if (distTag === 'local') {
    return plugin.version;
  }

  env.log.debug(`Checking for latest plugin version of ${chalk.green(plugin.name + '@' + distTag)}.`);

  const shellOptions = { showCommand: false };

  // TODO: might belong in utils/npm.ts
  if (config.cliFlags['yarn']) {
    cmdResult = await env.shell.run('yarn', ['info', plugin.name, `dist-tags.${distTag}`, '--json'], shellOptions);
    latestVersion = JSON.parse(cmdResult).data;
  } else {
    cmdResult = await env.shell.run('npm', ['view', plugin.name, `dist-tags.${distTag}`, '--json'], shellOptions);

    if (!cmdResult) {
      return plugin.version;
    }

    latestVersion = JSON.parse(cmdResult);
  }

  if (!latestVersion) {
    return plugin.version;
  }

  env.log.debug(`Latest version of ${chalk.green(plugin.name + '@' + distTag)} is ${latestVersion.trim()}.`);

  return latestVersion.trim();
}

export async function pkgInstallPluginArgs(env: IonicEnvironment, name: string, options: PkgInstallOptions = {}): Promise<string[]> {
  const releaseChannelName = determineDistTag(env.plugins.ionic.version);
  let pluginInstallVersion = `${name}@${releaseChannelName}`;

  if (releaseChannelName === 'local') {
    options.link = true;
    pluginInstallVersion = name;
  }

  return pkgInstallArgs(env, pluginInstallVersion, options);
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
