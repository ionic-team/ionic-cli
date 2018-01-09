import * as path from 'path';

import * as crossSpawnType from 'cross-spawn';

import chalk from 'chalk';

import { ILogger, IShell, IShellRunOptions, IShellOutputOptions, IShellSpawnOptions, ITaskChain } from '../definitions';
import { isExitCodeException } from '../guards';
import { FatalException } from './errors';
import { RunCmdOptions, prettyCommand, runcmd, spawncmd } from './utils/shell';

export const ERROR_SHELL_COMMAND_NOT_FOUND = 'SHELL_COMMAND_NOT_FOUND';

export interface ShellDeps {
  tasks: ITaskChain;
  log: ILogger;
  projectDir?: string;
}

export class Shell implements IShell {
  protected tasks: ITaskChain;
  protected log: ILogger;
  protected projectDir?: string;

  constructor({ tasks, log, projectDir }: ShellDeps) {
    this.tasks = tasks;
    this.log = log;
    this.projectDir = projectDir;
  }

  async run(command: string, args: string[], { showCommand = true, showError = true, fatalOnNotFound = true, fatalOnError = true, logOptions, truncateErrorOutput, ...crossSpawnOptions }: IShellRunOptions): Promise<void> {
    const fullCmd = prettyCommand(command, args);
    const truncatedCmd = fullCmd.length > 80 ? fullCmd.substring(0, 80) + '...' : fullCmd;
    const options: RunCmdOptions = { ...crossSpawnOptions };

    const log = this.log.clone(logOptions);

    if (showCommand) {
      const ws = log.createWriteStream();

      options.stdoutPipe = ws;
      options.stderrPipe = ws;
    }

    this.prepareSpawnOptions(options);

    if (showCommand && this.log.shouldLog('info')) {
      this.log.rawmsg(`> ${chalk.green(fullCmd)}`);
    }

    try {
      await runcmd(command, args, options);
    } catch (e) {
      if (e.code === 'ENOENT') {
        if (fatalOnNotFound) {
          throw new FatalException(`Command not found: ${chalk.green(command)}`, 127);
        } else {
          throw ERROR_SHELL_COMMAND_NOT_FOUND;
        }
      }

      if (!isExitCodeException(e)) {
        throw e;
      }

      let err = e.message || '';

      if (truncateErrorOutput && err.length > truncateErrorOutput) {
        err = `${chalk.bold('(truncated)')} ... ` + err.substring(err.length - truncateErrorOutput);
      }

      const publicErrorMsg = `An error occurred while running ${chalk.green(truncatedCmd)} (exit code ${e.exitCode})\n`;
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

  async output(command: string, args: string[], { fatalOnError = true, showCommand = false, ...crossSpawnOptions }: IShellOutputOptions): Promise<string> {
    const fullCmd = prettyCommand(command, args);
    const truncatedCmd = fullCmd.length > 80 ? fullCmd.substring(0, 80) + '...' : fullCmd;

    if (showCommand && this.log.shouldLog('info')) {
      this.log.rawmsg(`> ${chalk.green(fullCmd)}`);
    }

    try {
      return await runcmd(command, args, crossSpawnOptions);
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw new FatalException(`Command not found: ${chalk.green(command)}`, 127);
      }

      if (!isExitCodeException(e)) {
        throw e;
      }

      const errorMsg = `An error occurred while running ${chalk.green(truncatedCmd)} (exit code ${e.exitCode})\n`;

      if (fatalOnError) {
        throw new FatalException(errorMsg, e.exitCode);
      } else {
        this.log.error(errorMsg);
      }

      return '';
    }
  }

  async spawn(command: string, args: string[], { showCommand = true, ...crossSpawnOptions }: IShellSpawnOptions): Promise<crossSpawnType.ChildProcess> {
    const fullCmd = prettyCommand(command, args);
    this.prepareSpawnOptions(crossSpawnOptions);

    const p = await spawncmd(command, args, crossSpawnOptions);

    if (showCommand && this.log.shouldLog('info')) {
      this.log.rawmsg(`> ${chalk.green(fullCmd)}`);
    }

    return p;
  }

  async cmdinfo(cmd: string, args: string[] = []): Promise<string | undefined> {
    const opts: IShellSpawnOptions = {};
    this.prepareSpawnOptions(opts);

    try {
      const out = await runcmd(cmd, args, opts);
      return out.split('\n').join(' ');
    } catch (e) {
      // no command info at this point
    }
  }

  protected prepareSpawnOptions(options: IShellSpawnOptions) {
    if (!options.env) {
      options.env = {};
    }

    options.env.PATH = this.supplementPATH(process.env.PATH);
  }

  protected supplementPATH(p: string) {
    return this.projectDir ? `${path.resolve(this.projectDir, 'node_modules', '.bin')}${path.delimiter}${p}` : p;
  }
}
