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
 * Only supports use case 4: LOAD_NODE_MODULES
 *
 * @see https://nodejs.org/docs/latest-v8.x/api/modules.html#modules_require_resolve_request_options
 * @see https://nodejs.org/docs/latest-v8.x/api/modules.html#modules_all_together
 */
export function resolve(m: string, options?: { paths?: string[] }): string {
  const paths = options && options.paths ? options.paths : undefined;

  if (!paths) {
    // There is absolutely no reason to use this shim without the `paths`
    // option--use the built-in resolver.
    return require.resolve(m);
  }

  // LOAD_NODE_MODULES
  for (const p of paths) {
    const filePath = path.join(p, m);
    const foundPathAsFile = resolve.LOAD_AS_FILE(filePath);

    if (foundPathAsFile) {
      return foundPathAsFile;
    }

    const foundPathAsDirectory = resolve.LOAD_AS_DIRECTORY(filePath);

    if (foundPathAsDirectory) {
      return foundPathAsDirectory;
    }
  }

  const err: NodeJS.ErrnoException = new Error(`Cannot find module '${m}'`);
  err.code = 'MODULE_NOT_FOUND';
  throw err;
}

export namespace resolve {
  export function LOAD_AS_FILE(x: string): string | undefined {
    const exts = ['', '.js', '.json'];

    for (const ext of exts) {
      const p = x + ext;
      const stat = safeStatSync(p);

      if (stat && stat.isFile()) {
        return p;
      }
    }
  }

  export function LOAD_INDEX(x: string): string | undefined {
    const exts = ['.js', '.json'];

    for (const ext of exts) {
      const p = path.join(x, `index${ext}`);
      const stat = safeStatSync(p);

      if (stat && stat.isFile()) {
        return p;
      }
    }
  }

  export function LOAD_AS_DIRECTORY(x: string): string | undefined {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(x, 'package.json'), { encoding: 'utf8' }));

      if (packageJson.main) {
        const m = path.join(x, packageJson.main);
        const foundPathAsFile = resolve.LOAD_AS_FILE(m);

        if (foundPathAsFile) {
          return foundPathAsFile;
        }

        const foundPathAsIndex = resolve.LOAD_INDEX(m);

        if (foundPathAsIndex) {
          return foundPathAsIndex;
        }
      }
    } catch (e) {
      // ignore fs and json errors
    }

    const foundPath = resolve.LOAD_INDEX(x);

    if (foundPath) {
      return foundPath;
    }
  }
}

function safeStatSync(filePath: string): fs.Stats | undefined {
  try {
    return fs.statSync(filePath);
  } catch (e) {
    // ignore
  }
}
