import * as path from 'path';

import { fsReadFile } from '@ionic/cli-framework/utils/fs';

export async function getAndroidSdkToolsVersion(): Promise<string | undefined> {
  const androidHome = process.env.ANDROID_HOME;

  if (androidHome) {
    try {
      const f = await fsReadFile(path.join(androidHome, 'tools', 'source.properties'), { encoding: 'utf8' });

      for (let l of f.split('\n')) {
        const [ a, b ] = l.split('=');
        if (a === 'Pkg.Revision') {
          return b;
        }
      }
    } catch (e) {
      if (e.code !== 'ENOENT') {
        throw e;
      }
    }
  }

  return undefined;
}
