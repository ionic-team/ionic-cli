import * as fs from 'fs';

import { promisify } from './promisify';

export const ERROR_FILE_NOT_FOUND = 'FILE_NOT_FOUND';
export const ERROR_FILE_INVALID_JSON = 'FILE_INVALID_JSON';

export const fsReadFile = promisify<string, string, string>(fs.readFile);
export const fsWriteFile = promisify<void, string, any, { encoding?: string; mode?: number; flag?: string; }>(fs.writeFile);

export async function fsReadJsonFile(filePath: string): Promise<{ [key: string]: any }> {
  try {
    const f = await fsReadFile(filePath, 'utf8');
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

export async function fsWriteJsonFile(filePath: string, json: { [key: string]: any}, options: { encoding?: string; mode?: number; flag?: string; }): Promise<void> {
  return fsWriteFile(filePath, JSON.stringify(json, null, 2), options);
}

export async function fileToString(filepath: string): Promise<string> {
  try {
    return await fsReadFile(filepath, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') {
      return '';
    }

    throw e;
  }
}
