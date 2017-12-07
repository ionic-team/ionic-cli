import chalk from 'chalk';
import { minimistOptionsToArray } from '@ionic/cli-framework/lib';

import { IonicEnvironment } from '../../definitions';
import { importAppScripts } from './app-scripts';

export async function build({ env, options }: { env: IonicEnvironment; options: { _: string[]; [key: string]: any; }; }): Promise<void> {
  const appScriptsArgs = await buildOptionsToAppScriptsArgs(options);
  process.argv = ['node', 'appscripts'].concat(appScriptsArgs);

  const AppScripts = await importAppScripts(env);
  const context = AppScripts.generateContext();

  env.log.info(`Running app-scripts build: ${chalk.bold(appScriptsArgs.join(' '))}\n`);
  return await AppScripts.build(context);
}

export async function buildOptionsToAppScriptsArgs(options: { _: string[]; [key: string]: any; }) {
  const minimistArgs = {
    _: [],
    prod: options.prod ? true : false,
    aot: options.aot ? true : false,
    minifyjs: options.minifyjs ? true : false,
    minifycss: options.minifycss ? true : false,
    optimizejs: options.optimizejs ? true : false,
    platform: options.platform,
    target: options.target,
    env: options.env,
  };

  return minimistOptionsToArray(minimistArgs, { useEquals: false });
}
