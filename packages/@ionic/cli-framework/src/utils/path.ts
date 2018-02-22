import * as os from 'os';
import * as path from 'path';

export const tmpdir = os.tmpdir();

/**
 * Generate a random file path within the computer's temporary directory.
 *
 * @param prefix Optionally provide a filename prefix.
 */
export function tmpfilepath(prefix?: string): string {
  const rn = Math.random().toString(16).substring(2, 8);
  const p = path.resolve(tmpdir, prefix ? `${prefix}-${rn}` : rn);

  return p;
}

/**
 * Given an absolute system path, compile an array of paths working backwards
 * one directory at a time, always ending in the root directory.
 *
 * For example, `'/some/dir'` => `['/some/dir', '/some', '/']`
 */
export function compilePaths(filePath: string): string[] {
  filePath = path.normalize(filePath);

  if (!path.isAbsolute(filePath)) {
    throw new Error(`${filePath} is not an absolute path`);
  }

  const parsed = path.parse(filePath);

  if (filePath === parsed.root) {
    return [filePath];
  }

  return filePath
    .slice(parsed.root.length)
    .split(path.sep)
    .map((segment, i, array) => parsed.root + path.join(...array.slice(0, array.length - i)))
    .concat(parsed.root);
}
