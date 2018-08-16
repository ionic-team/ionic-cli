import * as path from 'path';

import { fsReadFile } from '@ionic/cli-framework/utils/fs';

export async function getAndroidSdkToolsVersion(): Promise<string | undefined> {
  const androidHome = await locateSDKHome();

  if (androidHome) {
    try {
      const f = await fsReadFile(path.join(androidHome, 'tools', 'source.properties'), { encoding: 'utf8' });
      return parseSDKVersion(f);
    } catch (e) {
      if (e.code !== 'ENOENT') {
        throw e;
      }
    }
  }
}

export async function locateSDKHome(): Promise<string | undefined> {
  return process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
}

export async function parseSDKVersion(contents: string): Promise<string | undefined> {
  for (const l of contents.split('\n')) {
    const [ a, b ] = l.split('=');
    if (a === 'Pkg.Revision') {
      return b;
    }
  }
}
