import * as path from 'path';

import { IonicEnvironment } from '../definitions';
import { pathExists } from '@ionic/cli-framework/utils/fs';

export async function isRepoInitialized(env: IonicEnvironment): Promise<boolean> {
  return await pathExists(path.join(env.project.directory, '.git'));
}

export async function initializeRepo(env: IonicEnvironment) {
  await env.shell.run('git', ['init'], { showSpinner: false, cwd: env.project.directory });
}

export async function getIonicRemote(env: IonicEnvironment): Promise<string | undefined> {
  const regex = /ionic\t(.+) \(\w+\)/;

  // would like to use get-url, but not available in git 2.0.0
  const remotes = await env.shell.run('git', ['remote', '-v'], { showCommand: false, cwd: env.project.directory });

  for (let line of remotes.split('\n')) {
    const match = regex.exec(line.trim());

    if (match) {
      return match[1];
    }
  }
}

export async function addIonicRemote(env: IonicEnvironment, url: string) {
  await env.shell.run('git', ['remote', 'add', 'ionic', url], { showSpinner: false, cwd: env.project.directory });
}

export async function setIonicRemote(env: IonicEnvironment, url: string) {
  await env.shell.run('git', ['remote', 'set-url', 'ionic', url], { showSpinner: false, cwd: env.project.directory });
}
