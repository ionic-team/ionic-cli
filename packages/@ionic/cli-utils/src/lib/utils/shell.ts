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
  if (!options.env) {
    options.env = {};
  }

  const PATH = typeof options.env.PATH === 'string' ? options.env.PATH : process.env.PATH;

  options.env = {
    ...process.env,
    ...options.env,
    PATH: PATH.split(path.delimiter).map(expandTildePath).join(path.delimiter),
  };

  const p = await spawncmd(command, args, options);

  return new Promise<string>((resolve, reject) => {
    const stdoutBufs: Buffer[] = [];
    const stderrBufs: Buffer[] = [];
    const dualBufs: Buffer[] = [];

    if (p.stdout) {
      if (options.stdoutPipe) {
        p.stdout.pipe(options.stdoutPipe);
      } else {
        p.stdout.on('data', chunk => {
          if (Buffer.isBuffer(chunk)) {
            stdoutBufs.push(chunk);
            dualBufs.push(chunk);
          } else {
            stdoutBufs.push(Buffer.from(chunk));
            dualBufs.push(Buffer.from(chunk));
          }
        });
      }
    }

    if (p.stderr) {
      if (options.stderrPipe) {
        p.stderr.pipe(options.stderrPipe);
      } else {
        p.stderr.on('data', chunk => {
          if (Buffer.isBuffer(chunk)) {
            stderrBufs.push(chunk);
            dualBufs.push(chunk);
          } else {
            stderrBufs.push(Buffer.from(chunk));
            dualBufs.push(Buffer.from(chunk));
          }
        });
      }
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

export async function spawncmd(command: string, args?: string[], options: crossSpawnType.SpawnOptions = {}): Promise<crossSpawnType.ChildProcess> {
  const crossSpawn = await import('cross-spawn');
  const p = crossSpawn.spawn(command, args, options);

  return p;
}

export async function forkcmd(command: string, args?: string[], options: crossSpawnType.SpawnOptions = {}): Promise<crossSpawnType.ChildProcess> {
  const cp = await import('child_process');
  const p = cp.fork(command, args, options);

  return p;
}

export function prettyCommand(command: string, args: string[]) {
  return command + ' ' + (args.length > 0 ? args.map(a => a.includes(' ') ? `"${a}"` : a).join(' ') : '');
}
