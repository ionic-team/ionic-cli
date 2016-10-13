export * from './definitions';
export * from './commands/command';

import * as minimist from 'minimist';
import * as chalk from 'chalk';
import getCommands from './commandList';
import { ICommand, PluginExports } from './definitions';
import getIonicPlugin, { isPluginAvailable, pluginPrefix } from './utils/pluginLoader';
import logger from './utils/logger';
import { metadataToOptimistOptions } from './utils/commandOptions';
import loadProject from './utils/project';

const defaultCommand = 'help';

function getCommand(name: string, commands: PluginExports): ICommand {
  let command: ICommand;

  /*
   * Each plugin can register its namespace and its commands.
   * - Should we allow a plugin to register its command without a namespace?
   *  - If so only Ionic specific plugins
   * Each plugin must have a namespace
   * Each command is called with specific environment information
   */

  /**
   * Check if command exists local to this package
   */
  if (commands.has(name)) {
    command = commands.get(name);

  /**
   * Check if command exists as a plugin
   * - Each npm package is named as @ionic/cli-plugin-<name>
   * - Each plugin command is prefixed with <plugin name>:
   */
  } else if (name && name.indexOf(':') !== -1) {
    const [pluginName, pluginCommand] = name.split(':');

    try {
      command = getIonicPlugin(pluginName).get(pluginCommand);

    /**
     * If command does not exist then lets show them help
     */
    } catch (e) {
      if (isPluginAvailable(pluginName)) {
        throw `
  This plugin is not currently installed. Please execute the following to install it.

      ${chalk.bold(`npm install ${pluginPrefix}${pluginName}`)}
  `;
      }
    }
  }

  if (!command) {
    command = commands.get(defaultCommand);
  }

  return command;
}

export async function run(pargv: string[]) {

  // Check version?
  const argv = minimist(pargv.slice(2));
  const commands = getCommands();

  // Global CLI option setup
  const logLevel: string = argv['loglevel'] || 'warn';
  const log = logger({
    level: logLevel,
    prefix: ''
  });
  const projectSettings = loadProject('.');

  let command = getCommand(argv._[0], commands); // TODO: This can throw an error

  async function runCommand(cmd: ICommand) {
    log.info('executing', cmd.metadata.name);

    const options = metadataToOptimistOptions(cmd.metadata);
    const argv = minimist(pargv.slice(3), options);

    try {
      await cmd.run({
        argv,
        projectSettings,
        utils: {
          log
        },
        commands
      });
    } catch (e) {
      log.error(e);
      process.exit(1); // TODO
    }
  }

  await runCommand(command);
}
