import chalk from 'chalk';

import { IonicEnvironment } from '../../definitions';

export async function build({ env, options }: { env: IonicEnvironment; options: { _: string[]; [key: string]: any; }; }): Promise<void> {
  await env.shell.run('ionic-v1', ['build'], { showExecution: true, cwd: env.project.directory, env: { FORCE_COLOR: chalk.enabled ? '1' : '0' } });
}
