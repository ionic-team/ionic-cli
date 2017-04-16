import * as chalk from 'chalk';

import { BuildHookArgs } from '@ionic/cli-utils';

import { minimistOptionsToArray } from './utils/arguments';
import { load } from './lib/modules';

export async function build(args: BuildHookArgs): Promise<void> {
  const appScriptsArgs = minimistOptionsToArray(args.options);
  process.argv = ['node', 'appscripts'].concat(appScriptsArgs);

  const AppScripts = load('@ionic/app-scripts');
  const context = AppScripts.generateContext();

  console.log(`  Running app-scripts build: ${chalk.bold(appScriptsArgs.join(' '))}`);
  return await AppScripts.build(context);
}
