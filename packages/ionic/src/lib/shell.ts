import { ERROR_SHELL_COMMAND_NOT_FOUND, LOGGER_LEVELS, ShellCommandError } from '@ionic/cli-framework';
import { createProcessEnv, killProcessTree, onBeforeExit } from '@ionic/cli-framework/utils/process';
import { ShellCommand, which } from '@ionic/cli-framework/utils/shell';
import { combineStreams } from '@ionic/cli-framework/utils/streams';
import chalk from 'chalk';
import { ChildProcess, SpawnOptions } from 'child_process';
import * as Debug from 'debug';
import * as path from 'path';
import * as split2 from 'split2';

import { ILogger, IShell, IShellOutputOptions, IShellRunOptions, IShellSpawnOptions } from '../definitions';
import { isExitCodeException } from '../guards';

import { FatalException } from './errors';

const debug = Debug('ionic:lib:shell');

export interface ShellDeps {
  readonly log: ILogger;
}

export interface ShellOptions {
  readonly alterPath?: (p: string) => string;
}

export class Shell implements IShell {
  readonly alterPath: (p: string) => string;

  constructor(protected readonly e: ShellDeps, options?: ShellOptions) {
    this.alterPath = options && options.alterPath ? options.alterPath : (p: string) => p;
  }

  async run(command: string, args: string[], { stream, killOnExit = true, showCommand = true, showError = true, fatalOnNotFound = true, fatalOnError = true, truncateErrorOutput, ...crossSpawnOptions }: IShellRunOptions): Promise<void> {
    this.prepareSpawnOptions(crossSpawnOptions);

    const cmdpath = await this.resolveCommandPath(command, crossSpawnOptions);
    const cmd = new ShellCommand(cmdpath, args, crossSpawnOptions);

    const fullCmd = cmd.bashify();
    const truncatedCmd = fullCmd.length > 80 ? fullCmd.substring(0, 80) + '...' : fullCmd;

    if (showCommand && this.e.log.level >= LOGGER_LEVELS.INFO) {
      this.e.log.rawmsg(`> ${chalk.green(fullCmd)}`);
    }

    const ws = stream ? stream : this.e.log.createWriteStream(LOGGER_LEVELS.INFO, false);

    try {
      const promise = cmd.run();

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
      if (e instanceof ShellCommandError && e.code === ERROR_SHELL_COMMAND_NOT_FOUND) {
        if (fatalOnNotFound) {
          throw new FatalException(`Command not found: ${chalk.green(command)}`, 127);
        } else {
          throw e;
        }
      }

      if (!isExitCodeException(e)) {
        throw e;
      }

      let err = e.message || '';

      if (truncateErrorOutput && err.length > truncateErrorOutput) {
        err = `${chalk.bold('(truncated)')} ... ` + err.substring(err.length - truncateErrorOutput);
      }

      const publicErrorMsg = (
        `An error occurred while running subprocess ${chalk.green(command)}.\n` +
        `${chalk.green(truncatedCmd)} exited with exit code ${e.exitCode}.\n\n` +
        `Re-running this command with the ${chalk.green('--verbose')} flag may provide more information.`
      );

      const privateErrorMsg = `Subprocess (${chalk.green(command)}) encountered an error (exit code ${e.exitCode}).`;

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

  async output(command: string, args: string[], { fatalOnNotFound = true, fatalOnError = true, showError = true, showCommand = false, ...crossSpawnOptions }: IShellOutputOptions): Promise<string> {
    const cmdpath = await this.resolveCommandPath(command, crossSpawnOptions);
    const cmd = new ShellCommand(cmdpath, args, crossSpawnOptions);

    const fullCmd = cmd.bashify();
    const truncatedCmd = fullCmd.length > 80 ? fullCmd.substring(0, 80) + '...' : fullCmd;

    if (showCommand && this.e.log.level >= LOGGER_LEVELS.INFO) {
      this.e.log.rawmsg(`> ${chalk.green(fullCmd)}`);
    }

    try {
      return await cmd.output();
    } catch (e) {
      if (e instanceof ShellCommandError && e.code === ERROR_SHELL_COMMAND_NOT_FOUND) {
        if (fatalOnNotFound) {
          throw new FatalException(`Command not found: ${chalk.green(command)}`, 127);
        } else {
          throw e;
        }
      }

      if (!isExitCodeException(e)) {
        throw e;
      }

      const errorMsg = `An error occurred while running ${chalk.green(truncatedCmd)} (exit code ${e.exitCode})\n`;

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
    if (process.platform === 'win32') {
      try {
        return await which(command, { PATH: options.env.PATH });
      } catch (e) {
        // ignore
      }
    }

    return command;
  }

  async spawn(command: string, args: string[], { showCommand = true, ...crossSpawnOptions }: IShellSpawnOptions): Promise<ChildProcess> {
    this.prepareSpawnOptions(crossSpawnOptions);

    const cmdpath = await this.resolveCommandPath(command, crossSpawnOptions);
    const cmd = new ShellCommand(cmdpath, args, crossSpawnOptions);
    const p = cmd.spawn();

    if (showCommand && this.e.log.level >= LOGGER_LEVELS.INFO) {
      this.e.log.rawmsg(`> ${chalk.green(cmd.bashify())}`);
    }

    return p;
  }

  async cmdinfo(command: string, args: string[] = []): Promise<string | undefined> {
    const opts: IShellSpawnOptions = {};
    this.prepareSpawnOptions(opts);

    const cmdpath = await this.resolveCommandPath(command, opts);
    const cmd = new ShellCommand(cmdpath, args, opts);

    try {
      const out = await cmd.output();
      return out.split('\n').join(' ').trim();
    } catch (e) {
      // no command info at this point
    }
  }

  protected prepareSpawnOptions(options: IShellSpawnOptions) {
    // Create a `process.env`-type object from all key/values of `process.env`,
    // then `options.env`, then add several key/values. PATH is supplemented
    // with the `node_modules\.bin` folder in the project directory so that we
    // can run binaries inside a project.
    options.env = createProcessEnv(process.env, options.env, {
      PATH: this.alterPath(process.env.PATH || ''),
      FORCE_COLOR: chalk.enabled ? '1' : '0',
    });
  }
}

export function prependNodeModulesBinToPath(projectDir: string, p: string): string {
  return path.resolve(projectDir, 'node_modules', '.bin') + path.delimiter + p;
}
