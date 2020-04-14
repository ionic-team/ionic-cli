import { LOGGER_LEVELS } from '@ionic/cli-framework';
import { createProcessEnv, killProcessTree, onBeforeExit } from '@ionic/utils-process';
import { ERROR_COMMAND_NOT_FOUND, Subprocess, SubprocessError, SubprocessOptions, WhichOptions, which } from '@ionic/utils-subprocess';
import { TERMINAL_INFO } from '@ionic/utils-terminal';
import * as chalk from 'chalk';
import { ChildProcess, SpawnOptions } from 'child_process';
import * as Debug from 'debug';
import * as path from 'path';
import * as split2 from 'split2';
import * as combineStreams from 'stream-combiner2';

import { ILogger, IShell, IShellOutputOptions, IShellRunOptions, IShellSpawnOptions } from '../definitions';
import { isExitCodeException } from '../guards';

import { input, strong } from './color';
import { FatalException } from './errors';

const debug = Debug('ionic:lib:shell');

export interface ShellDeps {
  readonly log: ILogger;
}

export interface ShellOptions {
  readonly alterPath?: (p: string) => string;
}

export class Shell implements IShell {
  alterPath: (p: string) => string;

  constructor(protected readonly e: ShellDeps, options?: ShellOptions) {
    this.alterPath = options && options.alterPath ? options.alterPath : (p: string) => p;
  }

  async run(command: string, args: readonly string[], { stream, killOnExit = true, showCommand = true, showError = true, fatalOnNotFound = true, fatalOnError = true, truncateErrorOutput, ...crossSpawnOptions }: IShellRunOptions): Promise<void> {
    this.prepareSpawnOptions(crossSpawnOptions);

    const proc = await this.createSubprocess(command, args, crossSpawnOptions);

    const fullCmd = proc.bashify();
    const truncatedCmd = fullCmd.length > 80 ? fullCmd.substring(0, 80) + '...' : fullCmd;

    if (showCommand && this.e.log.level >= LOGGER_LEVELS.INFO) {
      this.e.log.rawmsg(`> ${input(fullCmd)}`);
    }

    const ws = stream ? stream : this.e.log.createWriteStream(LOGGER_LEVELS.INFO, false);

    try {
      const promise = proc.run();

      if (promise.p.stdout) {
        const s = combineStreams(split2(), ws);

        // TODO: https://github.com/angular/angular-cli/issues/10922
        s.on('error', (err: Error) => {
          debug('Error in subprocess stdout pipe: %o', err);
        });

        promise.p.stdout.pipe(s);
      }

      if (promise.p.stderr) {
        const s = combineStreams(split2(), ws);

        // TODO: https://github.com/angular/angular-cli/issues/10922
        s.on('error', (err: Error) => {
          debug('Error in subprocess stderr pipe: %o', err);
        });

        promise.p.stderr.pipe(s);
      }

      if (killOnExit) {
        onBeforeExit(async () => {
          if (promise.p.pid) {
            await killProcessTree(promise.p.pid);
          }
        });
      }

      await promise;
    } catch (e) {
      if (e instanceof SubprocessError && e.code === ERROR_COMMAND_NOT_FOUND) {
        if (fatalOnNotFound) {
          throw new FatalException(`Command not found: ${input(command)}`, 127);
        } else {
          throw e;
        }
      }

      if (!isExitCodeException(e)) {
        throw e;
      }

      let err = e.message || '';

      if (truncateErrorOutput && err.length > truncateErrorOutput) {
        err = `${strong('(truncated)')} ... ` + err.substring(err.length - truncateErrorOutput);
      }

      const publicErrorMsg = (
        `An error occurred while running subprocess ${input(command)}.\n` +
        `${input(truncatedCmd)} exited with exit code ${e.exitCode}.\n\n` +
        `Re-running this command with the ${input('--verbose')} flag may provide more information.`
      );

      const privateErrorMsg = `Subprocess (${input(command)}) encountered an error (exit code ${e.exitCode}).`;

      if (fatalOnError) {
        if (showError) {
          throw new FatalException(publicErrorMsg, e.exitCode);
        } else {
          throw new FatalException(privateErrorMsg, e.exitCode);
        }
      } else {
        if (showError) {
          this.e.log.error(publicErrorMsg);
        }
      }

      throw e;
    }
  }

  async output(command: string, args: readonly string[], { fatalOnNotFound = true, fatalOnError = true, showError = true, showCommand = false, ...crossSpawnOptions }: IShellOutputOptions): Promise<string> {
    const proc = await this.createSubprocess(command, args, crossSpawnOptions);
    const fullCmd = proc.bashify();
    const truncatedCmd = fullCmd.length > 80 ? fullCmd.substring(0, 80) + '...' : fullCmd;

    if (showCommand && this.e.log.level >= LOGGER_LEVELS.INFO) {
      this.e.log.rawmsg(`> ${input(fullCmd)}`);
    }

    try {
      return await proc.output();
    } catch (e) {
      if (e instanceof SubprocessError && e.code === ERROR_COMMAND_NOT_FOUND) {
        if (fatalOnNotFound) {
          throw new FatalException(`Command not found: ${input(command)}`, 127);
        } else {
          throw e;
        }
      }

      if (!isExitCodeException(e)) {
        throw e;
      }

      const errorMsg = `An error occurred while running ${input(truncatedCmd)} (exit code ${e.exitCode})\n`;

      if (fatalOnError) {
        throw new FatalException(errorMsg, e.exitCode);
      } else {
        if (showError) {
          this.e.log.error(errorMsg);
        }
      }

      return '';
    }
  }

  /**
   * When `child_process.spawn` isn't provided a full path to the command
   * binary, it behaves differently on Windows than other platforms. For
   * Windows, discover the full path to the binary, otherwise fallback to the
   * command provided.
   *
   * @see https://github.com/ionic-team/ionic-cli/issues/3563#issuecomment-425232005
   */
  async resolveCommandPath(command: string, options: SpawnOptions): Promise<string> {
    if (TERMINAL_INFO.windows) {
      try {
        return await this.which(command, { PATH: options.env && options.env.PATH ? options.env.PATH : process.env.PATH });
      } catch (e) {
        // ignore
      }
    }

    return command;
  }

  async which(command: string, { PATH = process.env.PATH }: WhichOptions = {}): Promise<string> {
    return which(command, { PATH: this.alterPath(PATH || '') });
  }

  async spawn(command: string, args: readonly string[], { showCommand = true, ...crossSpawnOptions }: IShellSpawnOptions): Promise<ChildProcess> {
    this.prepareSpawnOptions(crossSpawnOptions);

    const proc = await this.createSubprocess(command, args, crossSpawnOptions);
    const p = proc.spawn();

    if (showCommand && this.e.log.level >= LOGGER_LEVELS.INFO) {
      this.e.log.rawmsg(`> ${input(proc.bashify())}`);
    }

    return p;
  }

  async cmdinfo(command: string, args: readonly string[] = []): Promise<string | undefined> {
    const opts: IShellSpawnOptions = {};
    this.prepareSpawnOptions(opts);

    const proc = await this.createSubprocess(command, args, opts);

    try {
      const out = await proc.output();
      return out.split('\n').join(' ').trim();
    } catch (e) {
      // no command info at this point
    }
  }

  async createSubprocess(command: string, args: readonly string[] = [], options: SubprocessOptions = {}): Promise<Subprocess> {
    const cmdpath = await this.resolveCommandPath(command, options);
    const proc = new Subprocess(cmdpath, args, options);

    return proc;
  }

  protected prepareSpawnOptions(options: IShellSpawnOptions) {
    // Create a `process.env`-type object from all key/values of `process.env`,
    // then `options.env`, then add several key/values. PATH is supplemented
    // with the `node_modules\.bin` folder in the project directory so that we
    // can run binaries inside a project.
    options.env = createProcessEnv(process.env, options.env ?? {}, {
      PATH: this.alterPath(process.env.PATH || ''),
      FORCE_COLOR: chalk.level > 0 ? '1' : '0',
    });
  }
}

export function prependNodeModulesBinToPath(projectDir: string, p: string): string {
  return path.resolve(projectDir, 'node_modules', '.bin') + path.delimiter + p;
}
