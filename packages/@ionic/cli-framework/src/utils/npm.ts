import * as fs from 'fs';
import * as path from 'path';

import { PackageJson } from '../definitions';
import { isPackageJson } from '../guards';

import { fsReadJsonFile } from './fs';
import { compilePaths } from './path';

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

export function compileNodeModulesPaths(filePath: string): string[] {
  return compilePaths(filePath).map(f => path.join(f, 'node_modules'));
}

/**
 * Poorly implemented shim for Node 8+ `require.resolve()`, with `paths`
 * option.
 *
 * @see https://nodejs.org/docs/latest-v8.x/api/modules.html#modules_require_resolve_request_options
 * @see https://nodejs.org/docs/latest-v8.x/api/modules.html#modules_all_together
 */
export function resolve(pkg: string, options?: { paths?: string[] }): string {
  const paths = options && options.paths ? options.paths : undefined;

  if (!paths) {
    // There is absolutely no reason to use this shim without the `paths`
    // option--use the built-in resolver.
    return require.resolve(pkg);
  }

  const safeStat = (filePath: string): fs.Stats | undefined => {
    try {
      return fs.statSync(filePath);
    } catch (e) {
      // ignore
    }
  };

  for (const p of paths) {
    const filePath = path.join(p, pkg);

    const filePaths = [filePath, filePath + '.js', filePath + '.json'];
    const stats = filePaths.map((p): [string, fs.Stats | undefined] => [p, safeStat(p)]);
    const found = stats.find(([p, s]) => typeof s !== 'undefined' && s.isFile());

    if (found) {
      return found[0];
    }

    const [ [ , stat ] ] = stats;

    if (stat && stat.isDirectory()) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(path.join(filePath, 'package.json'), { encoding: 'utf8' }));

        if (packageJson.main) {
          const mainPath = path.join(filePath, packageJson.main);
          const mainStat = safeStat(mainPath);

          if (mainStat && mainStat.isFile()) {
            return mainPath;
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }

  const err: NodeJS.ErrnoException = new Error(`Cannot find module '${pkg}'`);
  err.code = 'MODULE_NOT_FOUND';
  throw err;
}
