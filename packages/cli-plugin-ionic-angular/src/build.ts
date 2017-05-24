import * as chalk from 'chalk';

import { CommandHookArgs, minimistOptionsToArray } from '@ionic/cli-utils';

import { load } from './lib/modules';

export async function build(args: CommandHookArgs): Promise<void> {
  const appScriptsArgs = minimistOptionsToArray(args.options, { useEquals: false, ignoreFalse: true, allowCamelCase: true });
  process.argv = ['node', 'appscripts'].concat(appScriptsArgs);

  const AppScripts = load('@ionic/app-scripts');
  const context = AppScripts.generateContext();

  console.log(`Running app-scripts build: ${chalk.bold(appScriptsArgs.join(' '))}\n`);
  return await AppScripts.build(context);
}
