import * as crossSpawnType from 'cross-spawn';

import { load } from '../modules';

export function runcmd(command: string, args?: string[], options?: crossSpawnType.SpawnOptions): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const crossSpawn = load('cross-spawn');
    const p = crossSpawn.spawn(command, args, options);
    let stdoutBuf = Buffer.from([]);
    let stderrBuf = Buffer.from([]);

    if (p.stdout) {
      p.stdout.on('data', (chunk) => {
        if (Buffer.isBuffer(chunk)) {
          stdoutBuf = Buffer.concat([stdoutBuf, chunk]);
        } else {
          stdoutBuf.write(chunk);
        }
      });
    }

    if (p.stderr) {
      p.stderr.on('data', (chunk) => {
        if (Buffer.isBuffer(chunk)) {
          stderrBuf = Buffer.concat([stderrBuf, chunk]);
        } else {
          stderrBuf.write(chunk);
        }
      });
    }

    p.on('error', (err: Error) => {
      reject(err);
    });

    p.on('close', (code: number) => {
      if (code === 0) {
        resolve(stdoutBuf.toString());
      } else {
        reject([code, stderrBuf.toString()]);
      }
    });
  });
}
