import * as path from 'path';

import { readDirSafe } from '@ionic/utils-fs';

export async function getPlatforms(projectDir: string): Promise<string[]> {
  const platformsDir = path.resolve(projectDir, 'platforms');
  const dirContents = await readDirSafe(platformsDir);
  return dirContents.filter(f => f && f !== 'platforms.json' && !f.startsWith('.'));
}
