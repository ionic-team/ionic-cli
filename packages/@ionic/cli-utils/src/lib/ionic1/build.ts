import chalk from 'chalk';

import { IonicEnvironment } from '../../definitions';

export async function build({ env, options }: { env: IonicEnvironment; options: { _: string[]; [key: string]: any; }; }): Promise<void> {
  const project = await env.project.load();

  if (project.integrations.gulp && project.integrations.gulp.enabled !== false) {
    const { runTask } = await import('../gulp');
    await runTask(env, 'sass');
  } else {
    env.log.warn(`Not performing Ionic build for project type: ${chalk.bold(project.type)}.`);
  }
}
