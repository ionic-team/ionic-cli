import * as fs from 'fs';
import * as path from 'path';

import { findBaseDirectory, pathAccessible } from './lib/utils/fs';

export async function detectLocalCLI(): Promise<string | undefined> {
  const dir = await findBaseDirectory(process.cwd(), 'package.json');

  if (dir) {
    const local = path.join(dir, 'node_modules', 'ionic');
    const ok = await pathAccessible(local, fs.constants.R_OK);

    if (ok) {
      return local;
    }
  }
}
