import chalk from 'chalk';
import * as Debug from 'debug';
import { parsedArgsToArgv } from '@ionic/cli-framework/lib';

import { IonicEnvironment } from '../../definitions';

import { BUILD_SCRIPT } from '../build';

const debug = Debug('ionic:cli-utils:lib:ionic-angular:build');

export async function build({ env, options }: { env: IonicEnvironment; options: { _: string[]; [key: string]: any; }; }): Promise<void> {
  const { pkgManagerArgs } = await import('../utils/npm');
  const pkg = await env.project.loadPackageJson();

  const appScriptsArgs = await buildOptionsToAppScriptsArgs(options);
  const shellOptions = { showExecution: true, cwd: env.project.directory, env: { FORCE_COLOR: chalk.enabled ? '1' : '0' } };

  debug(`Looking for ${chalk.cyan(BUILD_SCRIPT)} npm script.`);

  if (pkg.scripts && pkg.scripts[BUILD_SCRIPT]) {
    debug(`Invoking ${chalk.cyan(BUILD_SCRIPT)} npm script.`);
    const [ pkgManager, ...pkgArgs ] = await pkgManagerArgs(env, { command: 'run', script: BUILD_SCRIPT, scriptArgs: appScriptsArgs });
    await env.shell.run(pkgManager, pkgArgs, shellOptions);
  } else {
    await env.shell.run('ionic-app-scripts', ['build', ...appScriptsArgs], shellOptions);
  }
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

  return parsedArgsToArgv(minimistArgs, { useEquals: false });
}
