import * as path from 'path';

import { pathExists } from '@ionic/cli-framework/utils/fs';

import { IShell } from '../definitions';

export interface GitUtilDeps {
  shell: IShell;
}

export async function isGitInstalled({ shell }: GitUtilDeps): Promise<boolean> {
  return Boolean(await shell.cmdinfo('git', ['--version']));
}

export async function isRepoInitialized(dir: string): Promise<boolean> {
  return pathExists(path.join(dir, '.git'));
}

export async function initializeRepo({ shell }: GitUtilDeps, dir: string) {
  await shell.run('git', ['init'], { cwd: dir });
}

export async function getIonicRemote({ shell }: GitUtilDeps, dir: string): Promise<string | undefined> {
  const regex = /ionic\t(.+) \(\w+\)/;

  // would like to use get-url, but not available in git 2.0.0
  const remotes = await shell.output('git', ['remote', '-v'], { cwd: dir });

  for (const line of remotes.split('\n')) {
    const match = regex.exec(line.trim());

    if (match) {
      return match[1];
    }
  }
}

export async function addIonicRemote({ shell }: GitUtilDeps, dir: string, url: string) {
  await shell.run('git', ['remote', 'add', 'ionic', url], { cwd: dir });
}

export async function setIonicRemote({ shell }: GitUtilDeps, dir: string, url: string) {
  await shell.run('git', ['remote', 'set-url', 'ionic', url], { cwd: dir });
}
