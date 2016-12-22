import * as os from 'os';
import * as path from 'path';
import * as minimist from 'minimist';
import * as chalk from 'chalk';
import * as inquirer from 'inquirer';

import { INamespace, ICommand, IIonicNamespaceRunOptions } from '../definitions';
import { Namespace } from './command/namespace';
import { formatCommandHelp } from './utils/help';
import { Logger } from './utils/logger';
import { FatalException } from './errors';
import { App } from './app';
import { Config } from './config';
import { Client } from './http';
import { Project } from './project';
import { Session } from './session';
import { Shell } from './shell';

const CONFIG_FILE = 'config.json';
const CONFIG_DIRECTORY = path.resolve(os.homedir(), '.ionic');
const PROJECT_FILE = 'ionic.config.json';

/**
 *
 */
export async function runCommand(primaryNamespace: Namespace, command: ICommand, inputs: string[]) {

  command.cli = primaryNamespace;
  command.env = primaryNamespace.env;

  await command.load();
  await command.execute(inputs);
  await command.unload();
}

/**
 *
 */
export async function execNamespace(pargv: string[], env: { [k: string]: string }, PrimaryNamespace: typeof Namespace, opts: IIonicNamespaceRunOptions = {}): Promise<void> {
  if (opts.showCommand === undefined) {
    opts.showCommand = false;
  }

  const argv = minimist(pargv);

  const log = new Logger();
  if (argv['log-level']) {
    log.level = argv['log-level'];
  }


  const config = new Config(env['IONIC_DIRECTORY'] || CONFIG_DIRECTORY, CONFIG_FILE);
  const c = await config.load();

  const client = new Client(c.urls.api);
  const project = new Project('.', PROJECT_FILE);
  const session = new Session(config, project, client);
  const app = new App(session, project, client);
  const shell = new Shell();

  const primaryNamespace = new PrimaryNamespace({
    app,
    client,
    config,
    inquirer,
    log,
    pargv,
    project,
    session,
    shell
  });

  let [inputs, command] = primaryNamespace.locateCommand(argv._);

  if (!command) {
    throw new FatalException(`Command not found: ${chalk.bold(argv._.join(' '))}.`);
  }

  if (argv['help']) {
    return console.log(formatCommandHelp(command.metadata));
  }

  if (opts.showCommand) {
    console.log(`\n> ${this.name} ${pargv.join(' ')}\n`);
  }

  runCommand(primaryNamespace, command, inputs);

  await config.save();
}
