import * as os from 'os';
import * as path from 'path';
import { ChildProcess, SpawnOptions } from 'child_process';
import { spawn } from 'cross-spawn';

import { ERROR_SHELL_COMMAND_NOT_FOUND, ERROR_SHELL_NON_ZERO_EXIT, ShellCommandError } from './errors';
import { createProcessEnv } from '../utils/process';
import { WritableStreamBuffer } from '../utils/streams';

export const TILDE_PATH_REGEX = /^~($|\/|\\)/;

export function expandTildePath(p: string) {
  const h = os.homedir();
  return p.replace(TILDE_PATH_REGEX, `${h}$1`);
}

export interface ShellCommandOptions extends SpawnOptions {}

export class ShellCommand {
  protected _options: SpawnOptions;

  constructor(public name: string, public args: ReadonlyArray<string>, options: ShellCommandOptions = {}) {
    this._options = options;
  }

  protected get options(): SpawnOptions {
    const opts = this._options;

    if (!opts.env) {
      opts.env = process.env;
    }

    const PATH = typeof opts.env.PATH === 'string' ? opts.env.PATH : process.env.PATH;
    const env = createProcessEnv(opts.env || {}, { PATH: PATH.split(path.delimiter).map(expandTildePath).join(path.delimiter) });

    return { ...opts, env };
  }

  async output(): Promise<string> {
    const stdoutBuf = new WritableStreamBuffer();
    const stderrBuf = new WritableStreamBuffer();
    const combinedBuf = new WritableStreamBuffer();

    stdoutBuf.once('pipe', src => {
      src.pipe(combinedBuf, { end: false });
    });

    stderrBuf.once('pipe', src => {
      src.pipe(combinedBuf, { end: false });
    });

    try {
      await this.pipedOutput(stdoutBuf, stderrBuf);
    } catch (e) {
      stdoutBuf.end();
      stderrBuf.end();
      e.output = (await combinedBuf.closeAndConsume()).toString();
      throw e;
    }

    stderrBuf.end();
    combinedBuf.end();

    return (await stdoutBuf.closeAndConsume()).toString();
  }

  async combinedOutput(): Promise<string> {
    const buf = new WritableStreamBuffer();

    try {
      await this.pipedOutput(buf, buf);
    } catch (e) {
      e.output = (await buf.closeAndConsume()).toString();
      throw e;
    }

    return (await buf.closeAndConsume()).toString();
  }

  async pipedOutput(stdout: NodeJS.WritableStream, stderr: NodeJS.WritableStream): Promise<void> {
    const p = this.spawn();

    if (p.stdout) {
      p.stdout.pipe(stdout, { end: false });
    }

    if (p.stderr) {
      p.stderr.pipe(stderr, { end: false });
    }

    return new Promise<void>((resolve, reject) => {
      p.on('error', (error: NodeJS.ErrnoException) => {
        let err: ShellCommandError;

        if (error.code === 'ENOENT') {
          err = new ShellCommandError('Command not found.');
          err.code = ERROR_SHELL_COMMAND_NOT_FOUND;
        } else {
          err = new ShellCommandError('Command error.');
        }

        err.error = error;
        reject(err);
      });

      p.on('close', (code, signal) => {
        if (code === 0) {
          resolve();
        } else {
          const err = new ShellCommandError('Non-zero exit from subprocess.');
          err.code = ERROR_SHELL_NON_ZERO_EXIT;
          err.exitCode = code;
          err.signal = signal ? signal : undefined;
          reject(err);
        }
      });
    });
  }

  spawn(): ChildProcess {
    return spawn(this.name, this.args, this.options);
  }
}
