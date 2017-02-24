import * as os from 'os';
import * as path from 'path';
import * as minimist from 'minimist';
import * as chalk from 'chalk';
import * as inquirer from 'inquirer';

import { INamespace, ICommand, CommandEnvironment } from '../../definitions';
import { Logger } from '../utils/logger';
import { App } from '../app';
import { Config } from '../config';
import { Client } from '../http';
import { Project } from '../project';
import { Session } from '../session';
import { Shell } from '../shell';
import { Telemetry } from '../telemetry';
import { getCliInfo } from '../utils/environmentInfo';

const CONFIG_FILE = 'config.json';
const CONFIG_DIRECTORY = path.resolve(os.homedir(), '.ionic');

/**
 * Run the command provided within the CommandEnvironment provided and optionally provide it with arguments.
 */
export async function runCommand(commandEnvironment: CommandEnvironment, pargv?: string[]): Promise<void> {

  pargv = pargv || commandEnvironment.pargv;
  const argv = minimist(pargv);
  const primaryNamespace = commandEnvironment.namespace;

  let [inputs, command] = primaryNamespace.locateCommand(argv._);

  // If the command was not found throw
  if (!command) {
    throw `Command not found: ${chalk.bold(argv._.join(' '))}.`;
  }

  command.env = commandEnvironment;

  await Promise.all([
    (async function(cmd: ICommand) {
      const configData = await commandEnvironment.config.load();
      if (configData.cliFlags.enableTelemetry !== false) {
        await cmd.env.telemetry.sendCommand(cmd.metadata.name, inputs);
      }
    })(command),
    (async function(cmd: ICommand) {

      await cmd.load();
      await cmd.execute(inputs);
      await cmd.unload();

      await commandEnvironment.config.save();
    })(command)
  ]);
}

/**
 * Create a command environment to execute commands within
 */
export async function createCommandEnvironment(pargv: string[], env: { [k: string]: string }, namespace: INamespace, pluginName?: string): Promise<CommandEnvironment> {

  const argv = minimist(pargv);
  const log = new Logger();

  // If verbose flag is passed the log.level becomes debug
  if (argv['verbose']) {
    argv['log-level'] = 'debug';
  }

  if (argv['log-level']) {
    log.level = argv['log-level'];
  }

  const config = new Config(env['IONIC_DIRECTORY'] || CONFIG_DIRECTORY, CONFIG_FILE);
  const c = await config.load();
  await config.save();
  const cliInfo = await getCliInfo();

  const client = new Client(c.urls.api);
  const project = new Project(env['PROJECT_DIR'], env['PROJECT_FILE']);
  const session = new Session(config, project, client);
  const app = new App(session, project, client);
  const shell = new Shell();

  const telemetry = new Telemetry(config, cliInfo);

  const commandEnvironment: CommandEnvironment = {
    app,
    client,
    config,
    inquirer,
    log,
    pargv,
    project,
    session,
    shell,
    telemetry,
    namespace,
    pluginName
  };

  return commandEnvironment;
}
