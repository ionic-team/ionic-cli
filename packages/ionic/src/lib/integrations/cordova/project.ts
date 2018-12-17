import * as path from 'path';

import { filter } from '@ionic/cli-framework/utils/array';
import { readDirSafe, statSafe } from '@ionic/utils-fs';

export async function getPlatforms(projectDir: string): Promise<string[]> {
  const platformsDir = path.resolve(projectDir, 'platforms');
  const contents = await readDirSafe(platformsDir);
  const platforms = await filter(contents, async file => {
    const stat = await statSafe(path.join(platformsDir, file));
    return !file.startsWith('.') && !!stat && stat.isDirectory();
  });

  return platforms;
}
