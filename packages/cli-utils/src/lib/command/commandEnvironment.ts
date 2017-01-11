import * as os from 'os';
import * as path from 'path';
import * as minimist from 'minimist';
import * as chalk from 'chalk';
import * as inquirer from 'inquirer';

import { INamespace, CommandEnvironment } from '../../definitions';
import { formatCommandHelp } from '../utils/help';
import { Logger } from '../utils/logger';
import { FatalException } from '../errors';
import { App } from '../app';
import { Config } from '../config';
import { Client } from '../http';
import { Project } from '../project';
import { Session } from '../session';
import { Shell } from '../shell';
import { fsReadDir } from '../utils/fs';

const CONFIG_FILE = 'config.json';
const CONFIG_DIRECTORY = path.resolve(os.homedir(), '.ionic');
const PROJECT_FILE = 'ionic.config.json';

/**
 * Run the command provided within the CommandEnvironment provided and optionally provide it with arguments.
 */
export async function runCommand(commandEnvironment: CommandEnvironment, pargv?: string[]): Promise<void> {

  pargv = pargv || commandEnvironment.pargv;
  const argv = minimist(pargv);
  const primaryNamespace = commandEnvironment.namespace;

  let [inputs, command] = primaryNamespace.locateCommand(argv._);

  if (command === undefined) {
    throw new FatalException(`Command not found: ${chalk.bold(argv._.join(' '))}.`);
  }

  if (argv['help']) {
    return console.log(formatCommandHelp(command.metadata));
  }

  command.env = commandEnvironment;

  await command.load();
  await command.execute(inputs);
  await command.unload();

  await commandEnvironment.config.save();
}

/**
 * Create a command environment to execute commands within
 */
export async function createCommandEnvironment(pargv: string[], env: { [k: string]: string }, namespace: INamespace): Promise<CommandEnvironment> {

  const argv = minimist(pargv);
  const projectDir = await getProjectRootDir(process.env.PWD);

  const log = new Logger();
  if (argv['log-level']) {
    log.level = argv['log-level'];
  }

  const config = new Config(env['IONIC_DIRECTORY'] || CONFIG_DIRECTORY, CONFIG_FILE);
  const c = await config.load();
  await config.save();

  const client = new Client(c.urls.api);
  const project = new Project(projectDir, PROJECT_FILE);
  const session = new Session(config, project, client);
  const app = new App(session, project, client);
  const shell = new Shell();

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
    namespace
  };

  return commandEnvironment;
}

/**
 * Find the base project directory based on the dir input
 */
async function getProjectRootDir(dir: string): Promise<string> {
  const dirInfo = path.parse(dir);
  const directoriesToCheck = dirInfo.dir
    .slice(dirInfo.root.length)
    .split(path.sep)
    .concat(dirInfo.base)
    .map((segment: string, index: number, array: string[]) => {
      let pathSegments = array.slice(0, (array.length - index));
      return dirInfo.root + path.join(...pathSegments);
    });

  for (let i = 0; i < directoriesToCheck.length; i++) {
    const results = await fsReadDir(dir);
    if (results.indexOf(PROJECT_FILE) !== -1) {
      return directoriesToCheck[i];
    }
  }

  return '';
}
