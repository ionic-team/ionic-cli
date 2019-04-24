import { concurrentFilter, map } from '@ionic/utils-array';
import { isExecutableFile } from '@ionic/utils-fs';
import { createProcessEnv, getPathParts } from '@ionic/utils-process';
import { WritableStreamBuffer } from '@ionic/utils-stream';
import { TERMINAL_INFO } from '@ionic/utils-terminal';
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

export interface SubprocessBashifyOptions {

  /**
   * Mask file path to first argument.
   *
   * The first argument to subprocesses is the program name or path, e.g.
   * `/path/to/bin/my-program`. If `true`, `bashify()` will return the program
   * name without a file path, e.g. `my-program`.
   *
   * The default is `true`.
   */
  maskArgv0?: boolean;

  /**
   * Mask file path to second argument.
   *
   * In some subprocesses, the second argument is a script file to run, e.g.
   * `node ./scripts/post-install`. If `true`, `bashify()` will return the
   * script name without a file path, e.g. `node post-install`.
   *
   * The default is `false`.
   */
  maskArgv1?: boolean;

  /**
   * Remove the first argument from output.
   *
   * Useful to make a command such as `node ./scripts/post-install` appear as
   * simply `post-install`.
   *
   * The default is `false`.
   */
  shiftArgv0?: boolean;
}

export class Subprocess {
  protected readonly path?: string;
  protected _options: SpawnOptions;

  constructor(public name: string, public args: readonly string[], options: SubprocessOptions = {}) {
    const masked = this.maskArg(name);

    if (masked !== name) {
      this.name = masked;
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

  bashify({ maskArgv0 = true, maskArgv1 = false, shiftArgv0 = false }: SubprocessBashifyOptions = {}): string {
    const args = [this.path ? this.path : this.name, ...this.args];

    if (shiftArgv0) {
      args.shift();
    }

    if (args[0] && maskArgv0) {
      args[0] = this.maskArg(args[0]);
    }

    if (args[1] && maskArgv1) {
      args[1] = this.maskArg(args[1]);
    }

    return args.length > 0
      ? args.map(arg => this.bashifyArg(arg)).join(' ')
      : '';
  }

  bashifyArg(arg: string): string {
    return arg.includes(' ') ? `"${arg.replace(/\"/g, '\\"')}"` : arg;
  }

  maskArg(arg: string): string {
    const i = arg.lastIndexOf(pathlib.sep);

    return i >= 0 ? arg.substring(i + 1) : arg;
  }
}

export function spawn(command: string, args: readonly string[] = [], options?: SpawnOptions): ChildProcess {
  return crossSpawn(command, [...args], options);
}

export function fork(modulePath: string, args: readonly string[] = [], options: ForkOptions & Pick<SpawnOptions, 'stdio'> = {}): ChildProcess {
  return _fork(modulePath, [...args], options);
}

export interface WhichOptions {
  PATH?: string;
  PATHEXT?: string;
}

const DEFAULT_PATHEXT = TERMINAL_INFO.windows ? '.COM;.EXE;.BAT;.CMD' : undefined;

/**
 * Find the first instance of a program in PATH.
 *
 * If `program` contains a path separator, this function will merely return it.
 *
 * @param program A command name, such as `ionic`
 */
export async function which(program: string, { PATH = process.env.PATH, PATHEXT = process.env.PATHEXT || DEFAULT_PATHEXT }: WhichOptions = {}): Promise<string> {
  if (program.includes(pathlib.sep)) {
    return program;
  }

  const results = await _findExecutables(program, { PATH });

  if (!results.length) {
    const err: NodeJS.ErrnoException = new Error(`${program} cannot be found within PATH`);
    err.code = 'ENOENT';
    throw err;
  }

  return results[0];
}

/**
 * Find all instances of a program in PATH.
 *
 * If `program` contains a path separator, this function will merely return it
 * inside an array.
 *
 * @param program A command name, such as `ionic`
 */
export async function findExecutables(program: string, { PATH = process.env.PATH, PATHEXT = process.env.PATHEXT || DEFAULT_PATHEXT }: WhichOptions = {}): Promise<string[]> {
  if (program.includes(pathlib.sep)) {
    return [program];
  }

  return _findExecutables(program, { PATH });
}

async function _findExecutables(program: string, { PATH = process.env.PATH, PATHEXT = process.env.PATHEXT || DEFAULT_PATHEXT }: WhichOptions = {}): Promise<string[]> {
  const pathParts = getPathParts(PATH);
  let programNames: string[];

  // if windows, cycle through all possible executable extensions
  // ex: node.exe, npm.cmd, etc.
  if (TERMINAL_INFO.windows) {
    const exts = getPathParts(PATHEXT).map(ext => ext.toLowerCase());
    // don't append extensions if one has already been provided
    programNames = exts.includes(pathlib.extname(program).toLowerCase()) ? [program] : exts.map(ext => program + ext);
  } else {
    programNames = [program];
  }

  return ([] as string[]).concat(...await map(programNames, async (programName): Promise<string[]> =>
    concurrentFilter(pathParts.map(p => pathlib.join(p, programName)), async p => isExecutableFile(p))));
}
