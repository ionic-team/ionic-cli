import * as path from 'path';

import * as crossSpawnType from 'cross-spawn';

import chalk from 'chalk';

import { ILogger, IProject, IShell, IShellRunOptions, IShellSpawnOptions, ITaskChain } from '../definitions';
import { isExitCodeException } from '../guards';
import { FatalException } from './errors';
import { RunCmdOptions, prettyCommand, runcmd, spawncmd } from './utils/shell';

export const ERROR_SHELL_COMMAND_NOT_FOUND = 'SHELL_COMMAND_NOT_FOUND';

export class Shell implements IShell {
  protected tasks: ITaskChain;
  protected log: ILogger;
  protected project: IProject;

  constructor({ tasks, log, project }: { tasks: ITaskChain; log: ILogger; project: IProject }) {
    this.tasks = tasks;
    this.log = log;
    this.project = project;
  }

  async run(command: string, args: string[], { showCommand = true, showError = true, fatalOnNotFound = true, fatalOnError = true, logOptions, showExecution, showSpinner = true, truncateErrorOutput, ...crossSpawnOptions }: IShellRunOptions): Promise<string> {
    const fullCmd = prettyCommand(command, args);
    const truncatedCmd = fullCmd.length > 80 ? fullCmd.substring(0, 80) + '...' : fullCmd;
    const options: RunCmdOptions = { ...crossSpawnOptions };

    const log = this.log.clone(logOptions);

    if (showExecution) {
      const ws = log.createWriteStream();

      options.stdoutPipe = ws;
      options.stderrPipe = ws;
    }

    this.prepareSpawnOptions(options);

    if (showCommand) {
      if (this.log.shouldLog('info')) {
        this.log.rawmsg(`> ${chalk.green(fullCmd)}`);
      }

      if (!showExecution && showSpinner) {
        // We use tasks on a short sentence such as this instead of the command
        // string above because the commands can get quite long, and then
        // inquirer dies. See
        // https://github.com/ionic-team/ionic-cli/issues/2649.
        this.tasks.next('Running command');
      }
    }

    try {
      try {
        const out = await runcmd(command, args, options);

        if (showExecution) {
          this.log.nl();
        }

        if (showCommand && !showExecution && showSpinner) {
          this.tasks.end();
        }

        return out;
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

        const helpLine = showExecution ? '.\n' : (err ? `:\n\n${err}` : ' with no output.\n');

        const publicErrorMsg = `An error occurred while running ${chalk.green(truncatedCmd)} (exit code ${e.exitCode})` + helpLine;
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
    } catch (e) {
      if (showCommand && !showExecution && showSpinner) {
        this.tasks.fail();
      }
      throw e;
    }
  }

  async spawn(command: string, args: string[], { showCommand = true, ...crossSpawnOptions }: IShellSpawnOptions): Promise<crossSpawnType.ChildProcess> {
    const fullCmd = prettyCommand(command, args);
    this.prepareSpawnOptions(crossSpawnOptions);

    const p = await spawncmd(command, args, crossSpawnOptions);

    if (showCommand) {
      if (this.log.shouldLog('info')) {
        this.log.rawmsg(`> ${chalk.green(fullCmd)}`);
      }
    }

    return p;
  }

  async cmdinfo(cmd: string, args: string[] = []): Promise<string | undefined> {
    try {
      const out = await runcmd(cmd, args, { env: { PATH: this.supplementPATH(process.env.PATH) } });
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
    return this.project.directory ? `${path.resolve(this.project.directory, 'node_modules', '.bin')}${path.delimiter}${p}` : p;
  }
}
