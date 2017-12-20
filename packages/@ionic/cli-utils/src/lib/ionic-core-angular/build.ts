import chalk from 'chalk';
import * as Debug from 'debug';

import { IonicEnvironment } from '../../definitions';

import { BUILD_SCRIPT } from '../build';

const debug = Debug('ionic:cli-utils:lib:ionic-core-angular:build');

export async function build({ env, options }: { env: IonicEnvironment; options: { _: string[]; [key: string]: any; }; }): Promise<void> {
  const { pkgManagerArgs } = await import('../utils/npm');
  const pkg = await env.project.loadPackageJson();

  const ngArgs = ['build'];
  const shellOptions = { showExecution: true, cwd: env.project.directory, env: { FORCE_COLOR: chalk.enabled ? '1' : '0' } };

  debug(`Looking for ${chalk.cyan(BUILD_SCRIPT)} npm script.`);

  if (pkg.scripts && pkg.scripts[BUILD_SCRIPT]) {
    debug(`Invoking ${chalk.cyan(BUILD_SCRIPT)} npm script.`);
    const [ pkgManager, ...pkgArgs ] = await pkgManagerArgs(env, { command: 'run', script: BUILD_SCRIPT });
    await env.shell.run(pkgManager, pkgArgs, shellOptions);
  } else {
    await env.shell.run('ng', ngArgs, shellOptions);
  }
}
