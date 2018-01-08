import * as path from 'path';

import chalk from 'chalk';

import { readDir } from '@ionic/cli-framework/utils/fs';

import { IonicEnvironment } from '../../../definitions';
import { FatalException } from '../../errors';

export async function getPlatforms(projectDir: string): Promise<string[]> {
  const platformsDir = path.resolve(projectDir, 'platforms');
  const dirContents = await readDir(platformsDir);
  return dirContents.filter(f => f && f !== 'platforms.json' && !f.startsWith('.'));
}

export async function installPlatform(env: IonicEnvironment, platform: string): Promise<void> {
  try {
    await env.shell.run('cordova', ['platform', 'add', platform, '--save'], { fatalOnError: false, showError: false });
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
