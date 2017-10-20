import * as fs from 'fs';
import * as path from 'path';

import * as semver from 'semver';

import { findBaseDirectory, pathAccessible } from '@ionic/cli-framework/utils/fs';
import { readPackageJsonFile } from '@ionic/cli-framework/utils/npm';

export const ERROR_BASE_DIRECTORY_NOT_FOUND = 'BASE_DIRECTORY_NOT_FOUND';
export const ERROR_LOCAL_CLI_NOT_FOUND = 'LOCAL_CLI_NOT_FOUND';
export const ERROR_VERSION_TOO_OLD = 'VERSION_TOO_OLD';

export async function detectLocalCLI(): Promise<string> {
  const dir = await findBaseDirectory(process.cwd(), 'package.json');

  if (!dir) {
    throw ERROR_BASE_DIRECTORY_NOT_FOUND;
  }

  const local = path.join(dir, 'node_modules', 'ionic');
  const ok = await pathAccessible(local, fs.constants.R_OK);

  if (!ok) {
    throw ERROR_LOCAL_CLI_NOT_FOUND;
  }

  const pkg = await readPackageJsonFile(path.join(local, 'package.json'));

  if (semver.lt(pkg.version || '', '3.10.0')) { // TODO: Really, the versions should match or be close. 3.10.0 is arbitrary.
    throw ERROR_VERSION_TOO_OLD;
  }

  return local;
}
