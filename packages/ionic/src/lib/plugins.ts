import * as path from 'path';
import * as chalk from 'chalk';
import * as inquirer from 'inquirer';

import {
  ERROR_FILE_INVALID_JSON,
  ERROR_FILE_NOT_FOUND,
  FatalException,
  IonicEnvironment,
  Plugin,
  Shell,
  TaskChain,
  fsReadDir,
  fsReadJsonFile,
} from '@ionic/cli-utils';

import { IonicNamespace } from '../commands';
import { load } from './utils/commonjs-loader';
import * as globalPlugin from '../index';

export const KNOWN_PLUGINS = ['cordova'];
export const ORG_PREFIX = '@ionic';
export const PLUGIN_PREFIX = 'cli-plugin-';
export const ERROR_PLUGIN_NOT_INSTALLED = 'PLUGIN_NOT_INSTALLED';
export const ERROR_PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND';
export const ERROR_PLUGIN_INVALID = 'PLUGIN_INVALID';

export async function loadPlugins(env: IonicEnvironment) {
  if (!env.project.directory) {
    return async (eventName: string): Promise<any> => {};
  }

  const mPath = path.join(env.project.directory, 'node_modules', '@ionic');
  const ionicModules = await fsReadDir(mPath);

  const pluginPkgs = ionicModules
    .filter(pkgName => pkgName.indexOf(PLUGIN_PREFIX) === 0)
    .map(pkgName => `${ORG_PREFIX}/${pkgName}`);

  const plugins = await Promise.all(
    pluginPkgs.map(pkgName => {
      return loadPlugin(env.project.directory, pkgName, false);
    })
  );

  for (let plugin of plugins) {
    if (plugin.registerEvents) {
      plugin.registerEvents(env.emitter);
    }
  }
}

/**
 * Synchronously load a plugin
 */
export async function loadPlugin(projectDir: string, pluginName: string, askToInstall: boolean = true): Promise<Plugin> {
  let m: Plugin | undefined;

  try {
    var mPath = path.join(projectDir, 'node_modules', ...pluginName.split('/'));
    m = load(mPath);
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }

    // Unfortuantly we need to check the not only the code but the error message
    let foundPackageNeeded = KNOWN_PLUGINS.map(kp => `${ORG_PREFIX}/${PLUGIN_PREFIX}${kp}`)
      .find(kp => e.message && e.message.includes(kp));
    if (!foundPackageNeeded) {
      throw `Dependency missing for ${chalk.bold(pluginName)}:\n\n  ${chalk.red('[ERROR]')}: ${e.message}`;
    }
  }
  if (!m && !askToInstall) {
    throw ERROR_PLUGIN_NOT_INSTALLED;
  }
  if (!m) {
    const answers: inquirer.Answers = await inquirer.prompt([{
      type: 'confirm',
      name: 'installPlugin',
      message: `This command's plugin ${chalk.green(pluginName)} is not installed would you like to install it and continue?`
    }]);

    if (answers['installPlugin']) {
      const releaseChannelName = await getReleaseChannelName();
      const pluginInstallVersion = `${pluginName}` + (releaseChannelName ? `@${releaseChannelName}` : '');
      const tasks = new TaskChain();

      tasks.next(`Executing npm command: ${chalk.bold(`npm install --save-dev ${pluginInstallVersion}`)}`);
      await new Shell().run('npm', ['install', '--save-dev', pluginInstallVersion ]);
      tasks.end();

      return loadPlugin(projectDir, pluginName);
    } else {
      throw ERROR_PLUGIN_NOT_INSTALLED;
    }
  }

  return m;
}

/**
 * Get inputs and command class based on arguments supplied
 */
export async function resolvePlugin(projectDir: string, projectFile: string, argv: string[]): Promise<[Plugin, string[]]> {
  let pluginName = '';
  let inputs: string[] = [];

  // If this module's primary namespace has the command then use it.
  const ionicNamespace = new IonicNamespace();
  const ionicCommands = ionicNamespace.getCommands();

  const isGlobalCmd = ionicCommands.has(argv[0]);
  if (isGlobalCmd || argv.length === 0) {
    return [ globalPlugin, argv ];
  }

  const ionicNamespaces = ionicNamespace.getNamespaces();

  // If the first arguement supplied contains a ':' then it is assumed that
  // this is calling a command in another namespace.
  // <namespaceName>:<commandName>
  if (argv[0].includes(':')) {
    let [firstArg, ...restOfArguments] = argv;
    [pluginName, firstArg] = firstArg.split(':');

    inputs = [firstArg, ...restOfArguments];
  }

  // If this we do not know the project directory and it is not a global
  // command then we can't run it.
  if (!projectDir) {
    throw chalk.bold(`This is not a global command please run this in your Ionic project's directory.\n`);
  }

  // Load the plugin using the pluginName provided
  try {
    if (!pluginName) {
      throw ERROR_PLUGIN_NOT_FOUND;
    }
    return [
      await loadPlugin(projectDir, `${ORG_PREFIX}/${PLUGIN_PREFIX}${pluginName}`),
      inputs
    ];
  } catch (e) {

    // If plugin is not found then lets make a recommendation based on whether
    // we know the plugin exists.
    if (e === ERROR_PLUGIN_NOT_INSTALLED) {
      const releaseChannelName = await getReleaseChannelName();
      const pluginInstallVersion = `${ORG_PREFIX}/${PLUGIN_PREFIX}${pluginName}` + (releaseChannelName ? `@${releaseChannelName}` : '');

      throw new FatalException('This plugin is not currently installed. Please execute the following to install it.\n\n'
                              + `    ${chalk.bold(`npm install --save-dev ${pluginInstallVersion}`)}\n`);
    } else if (e === ERROR_PLUGIN_NOT_FOUND) {
      throw new FatalException(`Unknown plugin: ${chalk.bold(ORG_PREFIX + '/' + PLUGIN_PREFIX + pluginName)}.`);
    }

    throw e;
  }
}

export async function getReleaseChannelName(): Promise<string | undefined> {
  let jsonStructure: any;
  const filePath = path.resolve(__dirname, '..', 'package.json');
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
