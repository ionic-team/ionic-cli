import * as fs from 'fs';

export async function readFile(p: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(p, { encoding: 'utf8' }, (err, contents) => {
      if (err) {
        return reject(err);
      }

      resolve(contents);
    });
  });
}

export async function writeFile(p: string, contents: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.writeFile(p, contents, { encoding: 'utf8' }, err => {
      if (err) {
        return reject(err);
      }

      resolve();
    });
  });
}

export async function unlink(p: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.unlink(p, err => {
      if (err) {
        return reject(err);
      }

      resolve();
    });
  });
}

export async function access(p: string, mode = fs.constants.F_OK): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.access(p, mode, err => {
      if (err) {
        return reject(err);
      }

      resolve();
    });
  });
}

export async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch (e) {
    return false;
  }
}
