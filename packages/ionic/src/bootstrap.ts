import { compileNodeModulesPaths, readPackageJsonFile, resolve } from '@ionic/cli-framework/utils/node';
import chalk from 'chalk';
import * as Debug from 'debug';
import * as path from 'path';
import * as semver from 'semver';

import { strong } from './lib/color';

if (process.argv.includes('--no-color')) {
  chalk.enabled = false;
}

const debug = Debug('ionic:bootstrap');

export const ERROR_BASE_DIRECTORY_NOT_FOUND = 'BASE_DIRECTORY_NOT_FOUND';
export const ERROR_LOCAL_CLI_NOT_FOUND = 'LOCAL_CLI_NOT_FOUND';
export const ERROR_VERSION_TOO_OLD = 'VERSION_TOO_OLD';

export async function detectLocalCLI(): Promise<string> {
  let pkgPath: string | undefined;

  try {
    pkgPath = resolve('ionic/package', { paths: compileNodeModulesPaths(process.cwd()) });
  } catch (e) {
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
