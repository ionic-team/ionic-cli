import * as path from 'path';

import { readDir } from '@ionic/cli-framework/utils/fs';

export async function getPlatforms(projectDir: string): Promise<string[]> {
  const platformsDir = path.resolve(projectDir, 'platforms');
  const dirContents = await readDir(platformsDir);
  return dirContents.filter(f => f && f !== 'platforms.json' && !f.startsWith('.'));
}
