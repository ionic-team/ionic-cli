import * as os from 'os';
import * as path from 'path';
import * as minimist from 'minimist';
import * as chalk from 'chalk';
import * as inquirer from 'inquirer';

import { ICommand, INamespace, IIonicNamespaceRunOptions } from '../definitions';
import { Namespace } from './command/namespace';
import { formatCommandHelp } from './utils/help';
import { Logger } from './utils/logger';
import { HelpCommand } from '../commands/help';
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
 * Recursively inspect inputs supplied to walk down all the tree of namespaces
 * available to find the command that we will execute.
 */
export function locateCommand(argv: string[], startingNamespace: INamespace): [string[], ICommand | undefined] {
  return (function ln(inputs: string[], ns: INamespace): [string[], ICommand | undefined] {
    const namespaces = ns.getNamespaces();

    if (!namespaces.has(inputs[0])) {
      const commands = ns.getCommands();
      const command = commands.get(inputs[0]);

      if (!command) {
        return [argv, undefined];
      }

      return [inputs.slice(1), command];
    }

    const nextNamespace = namespaces.get(inputs[0]);

    if (!nextNamespace) {
      return [argv, undefined];
    }

    return this(inputs.slice(1), nextNamespace);
  }(argv, startingNamespace));
}

/**
 *
 */
export async function execNamespace(pargv: string[], env: { [k: string]: string }, PrimaryNamespace: typeof Namespace, opts: IIonicNamespaceRunOptions = {}): Promise<void> {
  if (opts.showCommand === undefined) {
    opts.showCommand = true;
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

  let [inputs, command] = locateCommand(argv._, primaryNamespace);

  if (argv['help']) {
    if (!command) {
      throw new FatalException(`Command not found: ${chalk.bold(argv._.join(' '))}.`);
    }

    return console.log(formatCommandHelp(command.metadata));
  }

  if (!command) {
    command = new HelpCommand();
  }

  if (opts.showCommand) {
    console.log(`\n> ${this.name} ${pargv.join(' ')}\n`);
  }

  command.cli = primaryNamespace;
  command.env = primaryNamespace.env;

  await command.load();
  await command.execute(inputs);
  await command.unload();

  await config.save();
}
