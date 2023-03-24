import { compileNodeModulesPaths, readPackageJsonFile } from '@ionic/cli-framework/utils/node';
import Debug from 'debug';
import path from 'path';
import semver from 'semver';

import { strong } from './lib/color';

const debug = Debug('ionic:bootstrap');

export const ERROR_BASE_DIRECTORY_NOT_FOUND = 'BASE_DIRECTORY_NOT_FOUND';
export const ERROR_LOCAL_CLI_NOT_FOUND = 'LOCAL_CLI_NOT_FOUND';
export const ERROR_VERSION_TOO_OLD = 'VERSION_TOO_OLD';

export async function detectLocalCLI(): Promise<string> {
  let pkgPath: string | undefined;

  try {
    pkgPath = require.resolve('ionic/package', { paths: compileNodeModulesPaths(process.cwd()) });
  } catch (e: any) {
    // ignore
  }

  if (pkgPath && process.env.IONIC_CLI_LIB !== path.dirname(pkgPath)) {
    const pkg = await readPackageJsonFile(pkgPath);

    debug(`local CLI ${strong(pkg.version)} found at ${strong(pkgPath)}`);

    if (semver.lt(pkg.version, '4.0.0')) {
      throw ERROR_VERSION_TOO_OLD;
    }

    return path.dirname(pkgPath);
  }

  throw ERROR_LOCAL_CLI_NOT_FOUND;
}
