import * as fs from 'fs';

const ERROR_FILE_NOT_FOUND = 'FILE_NOT_FOUND';
const ERROR_FILE_INVALID_JSON = 'FILE_INVALID_JSON';

// TODO: promisify

export function readJsonFile(filePath: string): Promise<{ [key: string]: any }> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err: any, dataString: string) => {
      if (err) {
        if (err.code === 'ENOENT') {
          return reject(ERROR_FILE_NOT_FOUND);
        }

        return reject(err);
      }

      try {
        resolve(JSON.parse(dataString));
      } catch (e) {
        if (e instanceof SyntaxError) {
          return reject(ERROR_FILE_INVALID_JSON);
        }

        reject(e);
      }
    });
  });
}

export function writeJsonFile(json: { [key: string]: any }, filePath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    var jsonString = JSON.stringify(json, null, 2);

    fs.writeFile(filePath, jsonString, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

export function validate<T extends { [key: string]: any }>(o: { [key: string]: any }, predicate: (j: { [key: string]: any }) => boolean): o is T {
  return predicate(o);
}
