import { ERROR_SHELL_COMMAND_NOT_FOUND, LOGGER_LEVELS, ShellCommandError } from '@ionic/cli-framework';
import { createProcessEnv, onBeforeExit } from '@ionic/cli-framework/utils/process';
import { ShellCommand } from '@ionic/cli-framework/utils/shell';
import { combineStreams } from '@ionic/cli-framework/utils/streams';
import chalk from 'chalk';
import { ChildProcess } from 'child_process';
import * as Debug from 'debug';
import * as path from 'path';
import * as split2 from 'split2';

import { ILogger, IShell, IShellOutputOptions, IShellRunOptions, IShellSpawnOptions } from '../definitions';
import { isExitCodeException } from '../guards';

import { FatalException } from './errors';

const debug = Debug('ionic:cli-utils:lib:shell');

export interface ShellDeps {
  log: ILogger;
  projectDir?: string;
}

export class Shell implements IShell {
  protected log: ILogger;
  protected projectDir?: string;

  constructor({ log, projectDir }: ShellDeps) {
    this.log = log;
    this.projectDir = projectDir;
  }

  async run(command: string, args: string[], { stream, killOnExit = true, showCommand = true, showError = true, fatalOnNotFound = true, fatalOnError = true, truncateErrorOutput, ...crossSpawnOptions }: IShellRunOptions): Promise<void> {
    this.prepareSpawnOptions(crossSpawnOptions);
    const cmd = new ShellCommand(command, args, crossSpawnOptions);

    const fullCmd = cmd.bashify();
    const truncatedCmd = fullCmd.length > 80 ? fullCmd.substring(0, 80) + '...' : fullCmd;

    if (showCommand && this.log.level >= LOGGER_LEVELS.INFO) {
      this.log.rawmsg(`> ${chalk.green(fullCmd)}`);
    }

    const ws = stream ? stream : this.log.createWriteStream(LOGGER_LEVELS.INFO, false);

    try {
      const promise = cmd.run();

      if (promise.p.stdout) {
        const stream = combineStreams(split2(), ws);

        // TODO: https://github.com/angular/angular-cli/issues/10922
        stream.on('error', (err: Error) => {
          debug('Error in subprocess stdout pipe: %o', err);
        });

        promise.p.stdout.pipe(stream);
      }

      if (promise.p.stderr) {
        const stream = combineStreams(split2(), ws);

        // TODO: https://github.com/angular/angular-cli/issues/10922
        stream.on('error', (err: Error) => {
          debug('Error in subprocess stderr pipe: %o', err);
        });

        promise.p.stderr.pipe(stream);
      }

      if (killOnExit) {
        onBeforeExit(async () => promise.p.kill());
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
          this.log.error(publicErrorMsg);
        }
      }

      throw e;
    }
  }

  async output(command: string, args: string[], { fatalOnError = true, showError = true, showCommand = false, ...crossSpawnOptions }: IShellOutputOptions): Promise<string> {
    const cmd = new ShellCommand(command, args, crossSpawnOptions);

    const fullCmd = cmd.bashify();
    const truncatedCmd = fullCmd.length > 80 ? fullCmd.substring(0, 80) + '...' : fullCmd;

    if (showCommand && this.log.level >= LOGGER_LEVELS.INFO) {
      this.log.rawmsg(`> ${chalk.green(fullCmd)}`);
    }

    try {
      return await cmd.output();
    } catch (e) {
      if (e instanceof ShellCommandError && e.code === ERROR_SHELL_COMMAND_NOT_FOUND) {
        throw new FatalException(`Command not found: ${chalk.green(command)}`, 127);
      }

      if (!isExitCodeException(e)) {
        throw e;
      }

      const errorMsg = `An error occurred while running ${chalk.green(truncatedCmd)} (exit code ${e.exitCode})\n`;

      if (fatalOnError) {
        throw new FatalException(errorMsg, e.exitCode);
      } else {
        if (showError) {
          this.log.error(errorMsg);
        }
      }

      return '';
    }
  }

  spawn(command: string, args: string[], { showCommand = true, ...crossSpawnOptions }: IShellSpawnOptions): ChildProcess {
    this.prepareSpawnOptions(crossSpawnOptions);

    const cmd = new ShellCommand(command, args, crossSpawnOptions);
    const p = cmd.spawn();

    if (showCommand && this.log.level >= LOGGER_LEVELS.INFO) {
      this.log.rawmsg(`> ${chalk.green(cmd.bashify())}`);
    }

    return p;
  }

  async cmdinfo(command: string, args: string[] = []): Promise<string | undefined> {
    const opts: IShellSpawnOptions = {};
    this.prepareSpawnOptions(opts);

    const cmd = new ShellCommand(command, args, opts);

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
      PATH: this.supplementPATH(process.env.PATH),
      FORCE_COLOR: chalk.enabled ? '1' : '0',
    });
  }

  protected supplementPATH(p = ''): string {
    return this.projectDir ? `${path.resolve(this.projectDir, 'node_modules', '.bin')}${p ? path.delimiter + p : ''}` : p;
  }
}
