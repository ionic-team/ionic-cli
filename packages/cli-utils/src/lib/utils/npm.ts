import * as path from 'path';

import { PackageJson } from '../../definitions';
import { isPackageJson } from '../../guards';
import { fsReadJsonFile } from './fs';

export const ERROR_INVALID_PACKAGE_JSON = 'INVALID_PACKAGE_JSON';

export async function readPackageJsonFile(path: string): Promise<PackageJson> {
  const packageJson = await fsReadJsonFile(path);

  if (!isPackageJson(packageJson)) {
    throw ERROR_INVALID_PACKAGE_JSON;
  }

  return packageJson;
}

/**
 * Get package.json contents for the project package
 */
export async function readProjectPackageJsonFile(appDirectory: string): Promise<PackageJson> {
  const packageJsonPath = path.resolve(appDirectory, 'package.json');
  return await readPackageJsonFile(packageJsonPath);
}

