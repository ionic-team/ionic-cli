import * as path from 'path';
import * as chalk from 'chalk';
import * as inquirer from 'inquirer';

import { FatalException, Shell, TaskChain, fsReadJsonFile, ERROR_FILE_NOT_FOUND, ERROR_FILE_INVALID_JSON } from '@ionic/cli-utils';
import { IonicNamespace } from '../commands';
import * as globalPlugin from '../index';

export const defaultPlugin = 'core';
export const KNOWN_PLUGINS = [defaultPlugin, 'cordova'];
export const PREFIX = '@ionic/cli-plugin-';
export const ERROR_PLUGIN_NOT_INSTALLED = 'PLUGIN_NOT_INSTALLED';
export const ERROR_PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND';
export const ERROR_PLUGIN_INVALID = 'PLUGIN_INVALID';

/**
 * Synchronously load a plugin
 */
export async function loadPlugin(projectDir: string, name: string, askToInstall: boolean = true): Promise<any> {
  let m: any;

  try {
    var mPath = require.resolve(path.join(projectDir, 'node_modules', '@ionic', `cli-plugin-${name}`));
    m = require(mPath);
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }

    // Unfortuantly we need to check the not only the code but the error message
    let foundPackageNeeded = KNOWN_PLUGINS.map(kp => `${PREFIX}${kp}`)
      .find(kp => e.message && e.message.includes(kp));
    if (!foundPackageNeeded) {
      throw `Dependency missing for ${chalk.bold(PREFIX + name)}:\n\n  ${chalk.red('[ERROR]')}: ${e.message}`;
    }
  }
  if (!m && !askToInstall) {
    throw ERROR_PLUGIN_NOT_INSTALLED;
  }
  if (!m) {
    const pluginName = `${PREFIX}${name}`;
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
      await this.env.shell.run('npm', ['install', '--save-dev', pluginInstallVersion ]);
      tasks.end();

      return loadPlugin(projectDir, name);
    } else {
      throw ERROR_PLUGIN_NOT_INSTALLED;
    }
  }

  return m;
}

/**
 * Get inputs and command class based on arguments supplied
 */
export async function resolvePlugin(projectDir: string, argv: string[]): Promise<[any, string[]]> {
  let pluginName: string;
  let inputs: string[] = [];

  /**
   * If this module's primary namespace has the command then use it.
   */
  const ionicNamespace = new IonicNamespace();
  const isGlobalCmd = ionicNamespace.getCommands().has(argv[0]);
  if (isGlobalCmd || argv.length === 0) {
    return [
      globalPlugin,
      argv
    ];
  }

  // If this we do not know the project directory and it is not a global command then we can't run it.
  if (!projectDir) {
    throw chalk.bold(`This is not a global command please run this in your Ionic project's directory.\n`);
  }

  /**
   * If the first arguement supplied contains a ':' then
   * it is assumed that this is calling a command in another
   * namespace. <namespaceName>:<commandName>
   *
   * Else it is likely a core command that should be loaded
   * from the 'core' plugin.
   */
  if (argv[0].includes(':')) {

    let [firstArg, ...restOfArguments] = argv;
    [pluginName, firstArg] = firstArg.split(':');

    inputs = [firstArg, ...restOfArguments];

  } else if (KNOWN_PLUGINS.includes(argv[0])) {
    [pluginName, ...inputs] = argv;

  } else {
    pluginName = defaultPlugin;
    inputs = argv;
  }


  /**
   * Load the plugin using the pluginName provided
   */
  try {
    return [
      await loadPlugin(projectDir, pluginName),
      inputs
    ];
  } catch (e) {

    /**
     * If plugin is not found then lets make a recommendation
     * based on whether we know the plugin exists.
     */
    if (e === ERROR_PLUGIN_NOT_INSTALLED) {
      const releaseChannelName = await getReleaseChannelName();
      const pluginInstallVersion = `${PREFIX}${pluginName}` + (releaseChannelName ? `@${releaseChannelName}` : '');

      throw new FatalException('This plugin is not currently installed. Please execute the following to install it.\n\n'
                              + `    ${chalk.bold(`npm install --save-dev ${pluginInstallVersion}`)}\n`);
    } else if (e === ERROR_PLUGIN_NOT_FOUND) {
      throw new FatalException(`Unknown plugin: ${chalk.bold(PREFIX + pluginName)}.`);
    }

    throw e;
  }
}

export async function getReleaseChannelName(): Promise<string | undefined> {
  let jsonStructure: any;
  const filePath = path.resolve(__dirname, '..', '..', 'package.json');
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
