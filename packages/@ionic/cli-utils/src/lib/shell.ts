import * as path from 'path';

import * as chalk from 'chalk';

import { ILogger, IProject, IShell, IShellRunOptions, ITaskChain } from '../definitions';
import { isExitCodeException } from '../guards';
import { FatalException } from './errors';
import { RunCmdOptions, runcmd } from './utils/shell';

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

  async run(command: string, args: string[], { showCommand = true, showError = true, fatalOnNotFound = true, fatalOnError = true, showExecution, showSpinner = true, truncateErrorOutput, ...crossSpawnOptions }: IShellRunOptions): Promise<string> {
    const fullCmd = command + ' ' + (args.length > 0 ? args.map(a => a.includes(' ') ? `"${a}"` : a).join(' ') : '');
    const truncatedCmd = fullCmd.length > 80 ? fullCmd.substring(0, 80) + '...' : fullCmd;
    const options: RunCmdOptions = { ...crossSpawnOptions };

    if (showExecution) {
      options.stdoutPipe = this.log.stream;
      options.stderrPipe = this.log.stream;
    }

    if (!options.env) {
      options.env = {};
    }

    options.env.PATH = this.supplementPATH(process.env.PATH);

    if (showCommand) {
      if (this.log.shouldLog('info')) {
        this.log.msg(`> ${chalk.green(fullCmd)}`);
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

  async cmdinfo(cmd: string, args: string[] = []): Promise<string | undefined> {
    try {
      const out = await runcmd(cmd, args, { env: { PATH: this.supplementPATH(process.env.PATH) } });
      return out.split('\n').join(' ');
    } catch (e) {}
  }

  protected supplementPATH(p: string) {
    return this.project.directory ? `${path.resolve(this.project.directory, 'node_modules', '.bin')}${path.delimiter}${p}` : p;
  }
}
