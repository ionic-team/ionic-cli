import * as chalk from 'chalk';

import { IonicEnvironment } from '../../definitions';

import { importAppScripts } from './utils';

export async function build(args: { env: IonicEnvironment; options: { _: string[]; [key: string]: any; }; }): Promise<void> {
  const { minimistOptionsToArray } = await import('../utils/command');

  const appScriptsArgs = minimistOptionsToArray(args.options, { useEquals: false, ignoreFalse: true, allowCamelCase: true });
  process.argv = ['node', 'appscripts'].concat(appScriptsArgs);

  const AppScripts = await importAppScripts(args.env);;
  const context = AppScripts.generateContext();

  console.log(`Running app-scripts build: ${chalk.bold(appScriptsArgs.join(' '))}\n`);
  return await AppScripts.build(context);
}
