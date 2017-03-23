import * as chalk from 'chalk';

import * as AppScripts from '@ionic/app-scripts';
import {
  CommandLineInputs,
  CommandLineOptions,
  CommandData,
} from '@ionic/cli-utils';

import { minimistOptionsToArray } from './utils/arguments';

export async function build(cmdMetadata: CommandData, inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
  const appScriptsArgs = minimistOptionsToArray(options);
  process.argv = ['node', 'appscripts'].concat(appScriptsArgs);

  const appScripts: typeof AppScripts = require('@ionic/app-scripts');
  const context = appScripts.generateContext();

  console.log(`  Running app-scripts build: ${chalk.bold(appScriptsArgs.join(' '))}`);
  return await appScripts.build(context);
}
