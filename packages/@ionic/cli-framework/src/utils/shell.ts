import { statSafe } from '@ionic/utils-fs';
import { ChildProcess, ForkOptions, SpawnOptions, fork as _fork } from 'child_process';
import * as os from 'os';
import * as path from 'path';

import * as crossSpawn from 'cross-spawn';

import { ERROR_SHELL_COMMAND_NOT_FOUND, ERROR_SHELL_NON_ZERO_EXIT, ShellCommandError } from '../errors';
import { reduce } from '../utils/array';
import { createProcessEnv } from '../utils/process';
import { WritableStreamBuffer } from '../utils/streams';

export const TILDE_PATH_REGEX = /^~($|\/|\\)/;

export function expandTildePath(p: string) {
  const h = os.homedir();
  return p.replace(TILDE_PATH_REGEX, `${h}$1`);
}

export interface ShellCommandOptions extends SpawnOptions {}

export class ShellCommand {
  protected readonly path?: string;
  protected _options: SpawnOptions;

  constructor(public name: string, public args: ReadonlyArray<string>, options: ShellCommandOptions = {}) {
    const i = name.lastIndexOf(path.sep);

    if (i >= 0) {
      this.name = name.substring(i + 1);
      this.path = name;
    }

    this._options = options;
  }

  get options(): Readonly<SpawnOptions> {
    const opts = this._options;

    if (!opts.env) {
      opts.env = process.env;
    }

    const PATH = typeof opts.env.PATH === 'string' ? opts.env.PATH : process.env.PATH;

    const env = createProcessEnv(opts.env || {}, {
      // Some people prefix path parts with tilde, e.g. `~/.bin`. The tilde is
      // expanded here because it's a bash character and won't work with Node's
      // `child_process` outside of a shell.
      PATH: PATH.split(path.delimiter).map(expandTildePath).join(path.delimiter),
    });

    return { ...opts, env };
  }

  async output(): Promise<string> {
    this._options.stdio = 'pipe';

    const promise = this.run();
    const stdoutBuf = new WritableStreamBuffer();
    const stderrBuf = new WritableStreamBuffer();
    const combinedBuf = new WritableStreamBuffer();

    promise.p.stdout.pipe(stdoutBuf);
    promise.p.stdout.pipe(combinedBuf);
    promise.p.stderr.pipe(stderrBuf);
    promise.p.stderr.pipe(combinedBuf);

    try {
      await promise;
    } catch (e) {
      stdoutBuf.end();
      stderrBuf.end();
      e.output = combinedBuf.consume().toString();
      throw e;
    }

    stderrBuf.end();
    combinedBuf.end();

    return stdoutBuf.consume().toString();
  }

  async combinedOutput(): Promise<string> {
    this._options.stdio = 'pipe';

    const promise = this.run();
    const buf = new WritableStreamBuffer();

    promise.p.stdout.pipe(buf);
    promise.p.stderr.pipe(buf);

    try {
      await promise;
    } catch (e) {
      e.output = buf.consume().toString();
      throw e;
    }

    return buf.consume().toString();
  }

  run(): Promise<void> & { p: ChildProcess; } {
    const p = this.spawn();

    const promise = new Promise<void>((resolve, reject) => {
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

    Object.defineProperties(promise, {
      p: { value: p },
    });

    return promise as any;
  }

  spawn(): ChildProcess {
    return spawn(this.path ? this.path : this.name, this.args, this.options);
  }

  bashify(): string {
    return (
      `${this.name} ` +
      (this.args.length > 0
        ? this.args.map(arg => arg.includes(' ') ? `"${arg.replace(/\"/g, '\\"')}"` : arg).join(' ')
        : '')
    );
  }
}

export function spawn(command: string, args: ReadonlyArray<string> = [], options?: SpawnOptions): ChildProcess {
  return crossSpawn(command, [...args], options);
}

export function fork(modulePath: string, args: ReadonlyArray<string> = [], options: ForkOptions & Pick<SpawnOptions, 'stdio'> = {}): ChildProcess {
  return _fork(modulePath, [...args], options);
}

export interface WhichOptions {
  PATH?: string;
}

export async function which(command: string, { PATH = process.env.PATH || '' }: WhichOptions = {}): Promise<string> {
  if (command.includes(path.sep)) {
    return command;
  }

  const pathParts = PATH.split(path.delimiter);

  // tslint:disable:no-null-keyword

  const value = await reduce<string, string | null>(pathParts, async (acc, v) => {
    // acc is no longer null, so we found the first match already
    if (acc) {
      return acc;
    }

    const p = path.join(v, command);
    const stats = await statSafe(p);

    if (stats && stats.isFile()) {
      // TODO: check if file is executable
      return p;
    }

    return null;
  }, null);

  // tslint:enable:no-null-keyword

  if (!value) {
    const err: NodeJS.ErrnoException = new Error(`${command} cannot be found within PATH`);
    err.code = 'ENOENT';
    throw err;
  }

  return value;
}
