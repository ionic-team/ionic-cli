import * as os from 'os';
import * as path from 'path';
import * as crossSpawnType from 'cross-spawn';

import { ShellException } from '../errors';

export interface RunCmdOptions extends crossSpawnType.SpawnOptions {
  stdoutPipe?: NodeJS.WritableStream;
  stderrPipe?: NodeJS.WritableStream;
}

const TILDE_PATH_REGEX = /^~($|\/|\\)/;

export function expandTildePath(p: string) {
  const h = os.homedir();
  return p.replace(TILDE_PATH_REGEX, `${h}$1`);
}

export async function runcmd(command: string, args?: string[], options: RunCmdOptions = {}): Promise<string> {
  const crossSpawn = await import('cross-spawn');

  if (!options.env) {
    options.env = {};
  }

  const PATH = typeof options.env.PATH === 'string' ? options.env.PATH : process.env.PATH;

  options.env = {
    ...process.env,
    ...options.env,
    PATH: PATH.split(path.delimiter).map(expandTildePath).join(path.delimiter),
  };

  return new Promise<string>((resolve, reject) => {
    const p = crossSpawn.spawn(command, args, options);
    const stdoutBufs: Buffer[] = [];
    const stderrBufs: Buffer[] = [];
    const dualBufs: Buffer[] = [];

    if (p.stdout) {
      p.stdout.on('data', chunk => {
        if (options.stdoutPipe) {
          options.stdoutPipe.write(chunk);
        } else {
          if (Buffer.isBuffer(chunk)) {
            stdoutBufs.push(chunk);
            dualBufs.push(chunk);
          } else {
            stdoutBufs.push(Buffer.from(chunk));
            dualBufs.push(Buffer.from(chunk));
          }
        }
      });
    }

    if (p.stderr) {
      p.stderr.on('data', chunk => {
        if (options.stderrPipe) {
          options.stderrPipe.write(chunk);
        } else {
          if (Buffer.isBuffer(chunk)) {
            stderrBufs.push(chunk);
            dualBufs.push(chunk);
          } else {
            stderrBufs.push(Buffer.from(chunk));
            dualBufs.push(Buffer.from(chunk));
          }
        }
      });
    }

    p.on('error', err => {
      reject(err);
    });

    p.on('close', code => {
      if (code === 0) {
        resolve(Buffer.concat(stdoutBufs).toString());
      } else {
        reject(new ShellException(Buffer.concat(dualBufs).toString(), code));
      }
    });
  });
}
