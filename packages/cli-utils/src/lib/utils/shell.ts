import * as crossSpawnType from 'cross-spawn';

import { load } from '../modules';

export function runcmd(command: string, args?: string[], options?: crossSpawnType.SpawnOptions): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const crossSpawn = load('cross-spawn');
    const p = crossSpawn.spawn(command, args, options);
    let stdoutBufs: Buffer[] = [];
    let stderrBufs: Buffer[] = [];
    let dualBufs: Buffer[] = [];

    if (p.stdout) {
      p.stdout.on('data', (chunk) => {
        if (Buffer.isBuffer(chunk)) {
          stdoutBufs.push(chunk);
          dualBufs.push(chunk);
        } else {
          stdoutBufs.push(Buffer.from(chunk));
          dualBufs.push(Buffer.from(chunk));
        }
      });
    }

    if (p.stderr) {
      p.stderr.on('data', (chunk) => {
        if (Buffer.isBuffer(chunk)) {
          stderrBufs.push(chunk);
          dualBufs.push(chunk);
        } else {
          stderrBufs.push(Buffer.from(chunk));
          dualBufs.push(Buffer.from(chunk));
        }
      });
    }

    p.on('error', (err: Error) => {
      reject(err);
    });

    p.on('close', (code: number) => {
      if (code === 0) {
        resolve(Buffer.concat(stdoutBufs).toString());
      } else {
        reject([code, Buffer.concat(dualBufs).toString()]);
      }
    });
  });
}
