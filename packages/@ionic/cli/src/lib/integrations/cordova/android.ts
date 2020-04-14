import { readFile } from '@ionic/utils-fs';
import * as path from 'path';

export async function getAndroidSdkToolsVersion(): Promise<string | undefined> {
  const androidHome = await locateSDKHome();

  if (androidHome) {
    try {
      const f = await readFile(path.join(androidHome, 'tools', 'source.properties'), { encoding: 'utf8' });
      return `${await parseSDKVersion(f)} (${androidHome})`;
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
