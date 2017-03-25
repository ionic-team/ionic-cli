import * as chalk from 'chalk';

import * as AppScripts from '@ionic/app-scripts';
import { CLIEventEmitterBuildEventArgs } from '@ionic/cli-utils';

import { minimistOptionsToArray } from './utils/arguments';

export async function build(args: CLIEventEmitterBuildEventArgs): Promise<void> {
  const appScriptsArgs = minimistOptionsToArray(args.options);
  process.argv = ['node', 'appscripts'].concat(appScriptsArgs);

  const appScripts: typeof AppScripts = require('@ionic/app-scripts');
  const context = appScripts.generateContext();

  console.log(`  Running app-scripts build: ${chalk.bold(appScriptsArgs.join(' '))}`);
  return await appScripts.build(context);
}
