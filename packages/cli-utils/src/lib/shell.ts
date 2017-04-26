import * as chalk from 'chalk';

import { IShell, IShellRunOptions } from '../definitions';
import { FatalException } from './errors';
import { runcmd } from './utils/shell';

export const ERROR_SHELL_COMMAND_NOT_FOUND = 'SHELL_COMMAND_NOT_FOUND';

export class Shell implements IShell {
  async run(command: string, args: string[], { showExecution = true, showError = true, fatalOnNotFound = true, fatalOnError = true, truncateErrorOutput, ...crossSpawnOptions }: IShellRunOptions): Promise<string> {
    const fullCmd = command + ' ' + (args.length > 0 ? args.join(' ') : '');
    const truncatedCmd = fullCmd.length > 80 ? fullCmd.substring(0, 80) + '...' : fullCmd;

    if (showExecution) {
      console.log(`\n> ${chalk.green(fullCmd)}\n`);
    }

    try {
      const out = await runcmd(command, args, crossSpawnOptions);

      if (crossSpawnOptions.stdio === 'inherit') {
        process.stdout.write('\n');
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
          const helpLine = crossSpawnOptions.stdio === 'inherit' ? '.\n' : (err ? `:\n\n${err}` : ' with no output.\n');
          throw new FatalException(`An error occurred while running ${chalk.green(truncatedCmd)} (exit code ${code})` + helpLine, code);
        } else {
          throw new FatalException(`Subprocess (${chalk.green(command)}) encountered an error (exit code ${code}).`, code);
        }
      }

      throw e;
    }
  }
}
