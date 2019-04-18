import { compilePaths, readJson } from '@ionic/utils-fs';
import * as fs from 'fs';
import * as path from 'path';

import { PackageJson } from '../definitions';
import { isPackageJson } from '../guards';

export const ERROR_INVALID_PACKAGE_JSON = 'INVALID_PACKAGE_JSON';
export const ERROR_BIN_NOT_FOUND = 'BIN_NOT_FOUND';

/**
 * Lightweight version of https://github.com/npm/validate-npm-package-name
 */
export function isValidPackageName(name: string): boolean {
  return encodeURIComponent(name) === name;
}

export async function readPackageJsonFile(p: string): Promise<PackageJson> {
  const packageJson = await readJson(p);

  if (!isPackageJson(packageJson)) {
    throw ERROR_INVALID_PACKAGE_JSON;
  }

  return packageJson;
}

export function compileNodeModulesPaths(filePath: string): string[] {
  return compilePaths(filePath).map(f => path.join(f, 'node_modules'));
}

export interface ResolveOptions {
  paths?: string[];
}

export function resolveBin(m: string, bin: string, options?: ResolveOptions): string {
  const packageJsonPath = require.resolve(`${m}/package`, options);
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, { encoding: 'utf8' }));

  if (!isPackageJson(packageJson) || !packageJson.bin) {
    throw ERROR_INVALID_PACKAGE_JSON;
  }

  const desiredBin = packageJson.bin[bin];

  if (!desiredBin) {
    throw ERROR_BIN_NOT_FOUND;
  }

  return path.resolve(path.dirname(packageJsonPath), desiredBin);
}
