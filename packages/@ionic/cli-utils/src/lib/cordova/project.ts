import * as path from 'path';

import chalk from 'chalk';

import { IonicEnvironment } from '../../definitions';

import { FatalException } from '../errors';
import { fsReadDir } from '@ionic/cli-framework/utils/fs';

export async function getPlatforms(projectDir: string): Promise<string[]> {
  const platformsDir = path.resolve(projectDir, 'platforms');

  try {
    const dirContents = await fsReadDir(platformsDir);
    return dirContents.filter(f => f && f !== 'platforms.json');
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }

    return [];
  }
}

export async function installPlatform(env: IonicEnvironment, platform: string): Promise<void> {
  try {
    await env.shell.run('cordova', ['platform', 'add', platform, '--save'], { fatalOnError: false, showError: false, showExecution: true });
  } catch (e) {
    const s = String(e);

    if (s.match(/Platform [A-Za-z0-9-]+ already added/)) {
      env.log.warn(`Platform already added. Saving platforms to ${chalk.bold('config.xml')}.`);
      await env.shell.run('cordova', ['platform', 'save'], {});
    } else {
      throw new FatalException(s, typeof e.exitCode === 'undefined' ? 1 : e.exitCode);
    }
  }
}
