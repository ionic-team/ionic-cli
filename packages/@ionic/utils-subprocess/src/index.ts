import { reduce } from '@ionic/utils-array';
import { statSafe } from '@ionic/utils-fs';
import { createProcessEnv } from '@ionic/utils-process';
import { WritableStreamBuffer } from '@ionic/utils-stream';
import { ChildProcess, ForkOptions, SpawnOptions, fork as _fork } from 'child_process';
import * as crossSpawn from 'cross-spawn';
import * as os from 'os';
import * as pathlib from 'path';

export const ERROR_COMMAND_NOT_FOUND = 'ERR_SUBPROCESS_COMMAND_NOT_FOUND';
export const ERROR_NON_ZERO_EXIT = 'ERR_SUBPROCESS_NON_ZERO_EXIT';
export const ERROR_SIGNAL_EXIT = 'ERR_SUBPROCESS_SIGNAL_EXIT';

export const TILDE_PATH_REGEX = /^~($|\/|\\)/;

export function expandTildePath(p: string): string {
  const h = os.homedir();
  return p.replace(TILDE_PATH_REGEX, `${h}$1`);
}

/**
 * Prepare the PATH environment variable for use with subprocesses.
 *
 * If a raw tilde is found in PATH, e.g. `~/.bin`, it is expanded. The raw
 * tilde works in Bash, but not in Node's `child_process` outside of a shell.
 *
 * This is a utility method. You do not need to use it with `Subprocess`.
 *
 * @param path Defaults to `process.env.PATH`
 */
export function convertPATH(path = process.env.PATH || ''): string {
  return path.split(pathlib.delimiter).map(expandTildePath).join(pathlib.delimiter);
}

export class SubprocessError extends Error {
  readonly name = 'SubprocessError';
  message: string;
  stack: string;

  code?: typeof ERROR_COMMAND_NOT_FOUND | typeof ERROR_NON_ZERO_EXIT | typeof ERROR_SIGNAL_EXIT;
  error?: Error;
  output?: string;
  signal?: string;
  exitCode?: number;

  constructor(message: string) {
    super(message);
    this.message = message;
    this.stack = (new Error()).stack || '';
  }
}

export interface SubprocessOptions extends SpawnOptions {}

export class Subprocess {
  protected readonly path?: string;
  protected _options: SpawnOptions;

  constructor(public name: string, public args: ReadonlyArray<string>, options: SubprocessOptions = {}) {
    const i = name.lastIndexOf(pathlib.sep);

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

    const env = createProcessEnv(opts.env || {}, {
      PATH: convertPATH(typeof opts.env.PATH === 'string' ? opts.env.PATH : process.env.PATH),
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
        let err: SubprocessError;

        if (error.code === 'ENOENT') {
          err = new SubprocessError('Command not found.');
          err.code = ERROR_COMMAND_NOT_FOUND;
        } else {
          err = new SubprocessError('Command error.');
        }

        err.error = error;
        reject(err);
      });

      p.on('close', (code, signal) => {
        let err: SubprocessError;

        if (code === 0) {
          return resolve();
        }

        if (signal) {
          err = new SubprocessError('Signal exit from subprocess.');
          err.code = ERROR_SIGNAL_EXIT;
          err.signal = signal;
        } else {
          err = new SubprocessError('Non-zero exit from subprocess.');
          err.code = ERROR_NON_ZERO_EXIT;
          err.exitCode = code;
        }

        reject(err);
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
  if (command.includes(pathlib.sep)) {
    return command;
  }

  const pathParts = PATH.split(pathlib.delimiter);

  // tslint:disable:no-null-keyword

  const value = await reduce<string, string | null>(pathParts, async (acc, v) => {
    // acc is no longer null, so we found the first match already
    if (acc) {
      return acc;
    }

    const p = pathlib.join(v, command);
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
