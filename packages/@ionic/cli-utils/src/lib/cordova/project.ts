import * as path from 'path';

import * as chalk from 'chalk';

import { CordovaPlatform, IonicEnvironment } from '../../definitions';

import { FatalException } from '../errors';
import { CordovaPlatforms } from './config';

export async function getPlatforms(projectDir: string): Promise<CordovaPlatform[]> {
  const cdvPlatforms = new CordovaPlatforms(path.join(projectDir, 'platforms'), 'platforms.json');
  return cdvPlatforms.getPlatforms();
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
