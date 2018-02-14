import { PackageJson } from '../definitions';
import { isPackageJson } from '../guards';

import { fsReadJsonFile } from './fs';

export const ERROR_INVALID_PACKAGE_JSON = 'INVALID_PACKAGE_JSON';

/**
 * Lightweight version of https://github.com/npm/validate-npm-package-name
 */
export function isValidPackageName(name: string): boolean {
  return encodeURIComponent(name) === name;
}

export async function readPackageJsonFile(p: string): Promise<PackageJson> {
  const packageJson = await fsReadJsonFile(p);

  if (!isPackageJson(packageJson)) {
    throw ERROR_INVALID_PACKAGE_JSON;
  }

  return packageJson;
}


  }

}
