import * as fs from 'fs';
import * as os from 'os';
import * as readline from 'readline';

export function readLines(fsStream: NodeJS.ReadableStream): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    try {
      const lines: string[] = [];
      const rl = readline.createInterface({ input: fsStream });

      rl.on('line', (line: string) => {
        lines.push(line);
      });

      rl.on('close', () => {
        resolve(lines);
      });
    } catch(e) {
      reject(e);
    }
  });
}

export function writeLines(fsStream: NodeJS.WritableStream, lines: string[]): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fsStream.on('error', (err: any) => {
      reject(err);
    });

    fsStream.write(lines.join(os.EOL), 'utf8', (err: any) => {
      if (err) {
        return reject(err);
      }

      resolve();
    });
  });
}
