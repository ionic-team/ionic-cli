import * as minimist from 'minimist';
import * as chalk from 'chalk';

import { IonicEnvironment } from '../../definitions';

/**
 * Run the command provided within the CommandEnvironment provided and optionally provide it with arguments.
 */
export async function runCommand(ionicEnvironment: IonicEnvironment, pargv?: string[]): Promise<void> {

  pargv = pargv || ionicEnvironment.pargv;
  const argv = minimist(pargv);
  const primaryNamespace = ionicEnvironment.namespace;
  if (!primaryNamespace) {
    throw `No namespace supplied`;
  }

  let [inputs, command] = primaryNamespace.locateCommand(argv._);

  // If the command was not found throw
  if (!command) {
    throw `Command not found: ${chalk.bold(argv._.join(' '))}.`;
  }

  command.env = ionicEnvironment;

  await command.load();
  await command.execute(inputs);
  await command.unload();

  await ionicEnvironment.config.save();
}
