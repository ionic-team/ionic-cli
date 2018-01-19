import { BowerJson, PackageJson } from '../definitions';
import { isBowerJson, isPackageJson } from '../guards';
import { fsReadJsonFile } from './fs';

export const ERROR_INVALID_PACKAGE_JSON = 'INVALID_PACKAGE_JSON';
export const ERROR_INVALID_BOWER_JSON = 'INVALID_BOWER_JSON';

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

export async function readBowerJsonFile(p: string): Promise<BowerJson> {
  const bowerJson = await fsReadJsonFile(p);

  if (!isBowerJson(bowerJson)) {
    throw ERROR_INVALID_BOWER_JSON;
  }

  return bowerJson;
}
