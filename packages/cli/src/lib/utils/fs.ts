import * as fs from 'fs';

import { promisify } from './promisify';

export const ERROR_FILE_NOT_FOUND = 'FILE_NOT_FOUND';
export const ERROR_FILE_INVALID_JSON = 'FILE_INVALID_JSON';

const fsReadFile = promisify<string, string, string>(fs.readFile);
const fsWriteFile = promisify<void, string, string>(fs.writeFile);

export async function readJsonFile(filePath: string): Promise<{ [key: string]: any }> {
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

export async function writeJsonFile(filePath: string, json: { [key: string]: any}): Promise<void> {
  return fsWriteFile(filePath, JSON.stringify(json, null, 2));
}
