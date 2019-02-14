import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as stream from 'stream';
import * as through2 from 'through2';

import * as safe from './safe';

export * from 'fs-extra';

export { stat as statSafe, readdir as readdirSafe } from './safe';

export interface ReaddirPOptions {
  readonly filter?: (item: WalkerItem) => boolean;
  readonly walkerOptions?: WalkerOptions;
}

export async function readdirp(dir: string, { filter, walkerOptions }: ReaddirPOptions = {}): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    const items: string[] = [];

    let rs: NodeJS.ReadableStream = walk(dir, walkerOptions);

    if (filter) {
      rs = rs.pipe(through2.obj(function(obj: WalkerItem, enc, cb) {
        if (!filter || filter(obj)) {
          this.push(obj);
        }

        cb();
      }));
    }

    rs
      .on('error', (err: Error) => reject(err))
      .on('data', (item: WalkerItem) => items.push(item.path))
      .on('end', () => resolve(items));
  });
}

export const enum FileType {
  FILE = 'file',
  DIRECTORY = 'directory',
}

export interface RegularFileNode {
  path: string;
  type: FileType.FILE;
  parent: FileNode;
}

export interface DirectoryNode {
  path: string;
  type: FileType.DIRECTORY;
  parent?: FileNode;
  children: FileNode[];
}

export type FileNode = RegularFileNode | DirectoryNode;

export interface GetFileTreeOptions {
  readonly walkerOptions?: WalkerOptions;
}

/**
 * Compile and return a file tree structure.
 *
 * This function walks a directory structure recursively, building a nested
 * object structure in memory that represents it. When finished, the root
 * directory node is returned.
 *
 * @param dir The root directory from which to compile the file tree
 */
export async function getFileTree(dir: string, { walkerOptions }: GetFileTreeOptions = {}): Promise<FileNode> {
  const fileMap = new Map<string, FileNode>([]);

  const getOrCreateParent = (item: WalkerItem): DirectoryNode => {
    const parentPath = path.dirname(item.path);
    const parent = fileMap.get(parentPath);

    if (parent && parent.type === FileType.DIRECTORY) {
      return parent;
    }

    return { path: parentPath, type: FileType.DIRECTORY, children: [] };
  };

  const createFileNode = (item: WalkerItem, parent: DirectoryNode): FileNode => {
    return {
      path: item.path,
      parent,
      ...(item.stats.isDirectory() ? { type: FileType.DIRECTORY, children: [] } : { type: FileType.FILE }),
    };
  };

  return new Promise<FileNode>((resolve, reject) => {
    dir = path.resolve(dir);
    const rs = walk(dir, walkerOptions);

    rs
      .on('error', err => reject(err))
      .on('data', item => {
        const parent = getOrCreateParent(item);
        const node = createFileNode(item, parent);

        parent.children.push(node);
        fileMap.set(item.path, node);
        fileMap.set(parent.path, parent);
      })
      .on('end', () => {
        const root = fileMap.get(dir);

        if (!root) {
          return reject(new Error('No root node found after walking directory structure.'));
        }

        delete root.parent;
        resolve(root);
      });
  });
}

export async function fileToString(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, { encoding: 'utf8' });
  } catch (e) {
    if (e.code === 'ENOENT') {
      return '';
    }

    throw e;
  }
}

export async function getFileChecksum(filePath: string): Promise<string> {
  const crypto = await import('crypto');

  return new Promise<string>((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const input = fs.createReadStream(filePath);

    input.on('error', (err: Error) => {
      reject(err);
    });

    hash.once('readable', () => {
      const fullChecksum = (hash.read() as Buffer).toString('hex');
      resolve(fullChecksum);
    });

    input.pipe(hash);
  });
}

/**
 * Return true and cached checksums for a file by its path.
 *
 * Cached checksums are stored as `.md5` files next to the original file. If
 * the cache file is missing, the cached checksum is undefined.
 *
 * @param p The file path
 * @return Promise<[true checksum, cached checksum or undefined if cache file missing]>
 */
export async function getFileChecksums(p: string): Promise<[string, string | undefined]> {
  return Promise.all([
    getFileChecksum(p),
    (async () => {
      try {
        const md5 = await fs.readFile(`${p}.md5`, { encoding: 'utf8' });
        return md5.trim();
      } catch (e) {
        if (e.code !== 'ENOENT') {
          throw e;
        }
      }
    })(),
  ]);
}

/**
 * Store a cache file containing the source file's md5 checksum hash.
 *
 * @param p The file path
 * @param checksum The checksum. If excluded, the checksum is computed
 */
export async function cacheFileChecksum(p: string, checksum?: string): Promise<void> {
  const md5 = await getFileChecksum(p);
  await fs.writeFile(`${p}.md5`, md5, { encoding: 'utf8' });
}

export function writeStreamToFile(stream: NodeJS.ReadableStream, destination: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const dest = fs.createWriteStream(destination);
    stream.pipe(dest);
    dest.on('error', reject);
    dest.on('finish', resolve);
  });
}

export async function pathAccessible(filePath: string, mode: number): Promise<boolean> {
  try {
    await fs.access(filePath, mode);
  } catch (e) {
    return false;
  }

  return true;
}

export async function pathExists(filePath: string): Promise<boolean> {
  return pathAccessible(filePath, fs.constants.F_OK);
}

/**
 * Find the base directory based on the path given and a marker file to look for.
 */
export async function findBaseDirectory(dir: string, file: string): Promise<string | undefined> {
  if (!dir || !file) {
    return;
  }

  for (const d of compilePaths(dir)) {
    const results = await safe.readdir(d);

    if (results.includes(file)) {
      return d;
    }
  }
}

/**
 * Generate a random file path within the computer's temporary directory.
 *
 * @param prefix Optionally provide a filename prefix.
 */
export function tmpfilepath(prefix?: string): string {
  const rn = Math.random().toString(16).substring(2, 8);
  const p = path.resolve(os.tmpdir(), prefix ? `${prefix}-${rn}` : rn);

  return p;
}

/**
 * Given an absolute system path, compile an array of paths working backwards
 * one directory at a time, always ending in the root directory.
 *
 * For example, `'/some/dir'` => `['/some/dir', '/some', '/']`
 *
 * @param filePath Absolute system base path.
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

export interface WalkerItem {
  path: string;
  stats: fs.Stats;
}

export interface WalkerOptions {
  /**
   * Filter out file paths during walk.
   *
   * As the file tree is walked, this function can be used to exclude files and
   * directories from the final result.
   *
   * It can also be used to tune performance. If a subdirectory is excluded, it
   * is not walked.
   *
   * @param p The file path.
   * @return `true` to include file path, otherwise it is excluded
   */
  readonly pathFilter?: (p: string) => boolean;
}

export interface Walker extends stream.Readable {
  on(event: 'data', callback: (item: WalkerItem) => void): this;
  on(event: string, callback: (...args: any[]) => any): this;
}

export class Walker extends stream.Readable {
  readonly paths: string[] = [this.p];

  constructor(readonly p: string, readonly options: WalkerOptions = {}) {
    super({ objectMode: true });
  }

  _read() {
    const p = this.paths.shift();
    const { pathFilter } = this.options;

    if (!p) {
      this.push(null); // tslint:disable-line:no-null-keyword
      return;
    }

    fs.lstat(p, (err, stats) => {
      if (err) {
        this.emit('error', err);
        return;
      }

      const item: WalkerItem = { path: p, stats };

      if (stats.isDirectory()) {
        fs.readdir(p, (err, contents) => {
          if (err) {
            this.emit('error', err);
            return;
          }

          let paths = contents.map(file => path.join(p, file));

          if (pathFilter) {
            paths = paths.filter(p => pathFilter(p.substring(this.p.length + 1)));
          }

          this.paths.push(...paths);
          this.push(item);
        });
      } else {
        this.push(item);
      }
    });
  }
}

export function walk(p: string, options: WalkerOptions = {}): Walker {
  return new Walker(p, options);
}
