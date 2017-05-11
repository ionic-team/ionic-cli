import * as chalk from 'chalk';

import { ILogger, IShell, IShellRunOptions, ITaskChain } from '../definitions';
import { FatalException } from './errors';
import { RunCmdOptions, runcmd } from './utils/shell';

export const ERROR_SHELL_COMMAND_NOT_FOUND = 'SHELL_COMMAND_NOT_FOUND';

export class Shell implements IShell {
  constructor(protected tasks: ITaskChain, protected log: ILogger) { }

  async run(command: string, args: string[], { showCommand = true, showError = true, fatalOnNotFound = true, fatalOnError = true, showExecution, truncateErrorOutput, ...crossSpawnOptions }: IShellRunOptions): Promise < string > {
    const fullCmd = command + ' ' + (args.length > 0 ? args.join(' ') : '');
    const truncatedCmd = fullCmd.length > 80 ? fullCmd.substring(0, 80) + '...' : fullCmd;
    const options: RunCmdOptions = {...crossSpawnOptions };

    if(typeof showExecution === 'undefined') {
  showExecution = this.log.shouldLog('debug');
}

if (showExecution) {
  options.stdoutPipe = this.log.stream;
  options.stderrPipe = this.log.stream;
}

if (showCommand) {
  this.log.msg(`> ${chalk.green(fullCmd)}`);

  if (!showExecution) {
    this.tasks.next('Running command');
  }
}

try {
  try {
    const out = await runcmd(command, args, options);

    if (showExecution) {
      this.log.nl();
    }

    if (showCommand && !showExecution) {
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

    if (!Array.isArray(e)) {
      throw e;
    }

    let [code, err] = e;

    if (truncateErrorOutput && err && err.length > truncateErrorOutput) {
      err = `${chalk.bold('(truncated)')} ... ` + err.substring(err.length - truncateErrorOutput);
    }

    if (fatalOnError) {
      if (showError) {
        const helpLine = showExecution ? '.\n' : (err ? `:\n\n${err}` : ' with no output.\n');
        throw new FatalException(`An error occurred while running ${chalk.green(truncatedCmd)} (exit code ${code})` + helpLine, code);
      } else {
        throw new FatalException(`Subprocess (${chalk.green(command)}) encountered an error (exit code ${code}).`, code);
      }
    }

    throw e;
  }
} catch (e) {
  if (showCommand && !showExecution) {
    this.tasks.fail();
  }
  throw e;
}
  }
}
