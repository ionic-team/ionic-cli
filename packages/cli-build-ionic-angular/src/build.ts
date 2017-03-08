import * as chalk from 'chalk';
import {
  CommandLineInputs,
  CommandLineOptions,
  CommandData,
} from '@ionic/cli-utils';
import { minimistOptionsToArray } from './utils/arguments';

export default async function build(cmdMetadata: CommandData, inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
  const appScriptsArgs = minimistOptionsToArray(options);
  process.argv = ['node', 'appscripts'].concat(appScriptsArgs);

  const appScripts = require('@ionic/app-scripts');
  const context = appScripts.generateContext();

  console.log(`  Running app-scripts build: ${chalk.bold(appScriptsArgs.join(' '))}`);
  await appScripts.build(context);
}
