import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as rimraf from 'rimraf';

import { promisify } from './promise';
import { load } from '../modules';

export const ERROR_FILE_NOT_FOUND = 'FILE_NOT_FOUND';
export const ERROR_FILE_INVALID_JSON = 'FILE_INVALID_JSON';
export const ERROR_OVERWRITE_DENIED = 'OVERWRITE_DENIED';

export interface FSReadFileOptions {
  encoding: string;
  flag?: string;
}

export interface FSWriteFileOptions {
  encoding: string;
  mode?: number;
  flag?: string;
}

export const fsMkdir = promisify<void, string, number>(fs.mkdir);
export const fsStat = promisify<fs.Stats, string>(fs.stat);
export const fsReadFile = promisify<string, string, FSReadFileOptions>(fs.readFile);
export const fsWriteFile = promisify<void, string, any, FSWriteFileOptions>(fs.writeFile);
export const fsReadDir = promisify<string[], string>(fs.readdir);
export const rimrafp = promisify<void, string>(rimraf);

export async function readDir(filePath: string): Promise<string[]> {
  try {
    return await fsReadDir(filePath);
  } catch (e) {
    if (e.code === 'ENOENT') {
      return [];
    }

    throw e;
  }
}

export async function fsReadJsonFile(filePath: string, options: FSReadFileOptions = { encoding: 'utf8' }): Promise<{ [key: string]: any }> {
  try {
    const f = await fsReadFile(filePath, options);
    return JSON.parse(f);
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw ERROR_FILE_NOT_FOUND;
    } else if (e instanceof SyntaxError) {
      throw ERROR_FILE_INVALID_JSON;
    }

    throw e;
  }
}

export async function fsWriteJsonFile(filePath: string, json: { [key: string]: any }, options: FSWriteFileOptions): Promise<void> {
  return fsWriteFile(filePath, JSON.stringify(json, null, 2) + '\n', options);
}

export async function fileToString(filepath: string): Promise<string> {
  try {
    return await fsReadFile(filepath, { encoding: 'utf8' });
  } catch (e) {
    if (e.code === 'ENOENT') {
      return '';
    }

    throw e;
  }
}

export async function fsMkdirp(p: string, mode?: number): Promise<void> {
  if (typeof mode === 'undefined') {
    mode = 0o777 & (~process.umask());
  }

  const absPath = path.resolve(p);
  const pathObj = path.parse(absPath);
  const dirnames = absPath.split(path.sep).splice(1);
  const dirs = dirnames.map((v, i) => path.resolve(pathObj.root, ...dirnames.slice(0, i), v));

  for (let dir of dirs) {
    try {
      await fsMkdir(dir, mode);
    } catch (e) {
      if (e.code !== 'EEXIST') {
        throw e;
      }
    }
  }
}

export function getFileChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {

    const hash = crypto.createHash('md5');
    const input = fs.createReadStream(filePath);

    input.on('error', (err: Error) => {
      reject(err);
    });

    hash.once('readable', () => {
      // const fullChecksum = hash.digest().toString('hex');
      const fullChecksum = (<Buffer>hash.read()).toString('hex'); // TODO: digest() already called?
      resolve(fullChecksum);
    });

    input.pipe(hash);
  });
}

export function writeStreamToFile(stream: NodeJS.ReadableStream, destination: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const dest = fs.createWriteStream(destination);
    stream.pipe(dest);
    dest.on('error', reject);
    dest.on('finish', resolve);
  });
}

export function copyDirectory(source: string, destination: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const ncp = load('ncp');
    ncp.ncp(source, destination, (err: Error) => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
}

export function copyFile(fileName: string, target: string, mode: number = 0o777) {
  return new Promise((resolve, reject) => {
    let readStream = fs.createReadStream(fileName);
    let writeStream = fs.createWriteStream(target, { mode: mode });

    readStream.on('error', reject);
    writeStream.on('error', reject);

    writeStream.on('open', function() {
      readStream.pipe(writeStream);
    });

    writeStream.once('finish', resolve);
  });
}
