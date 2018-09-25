import { ERROR_SHELL_COMMAND_NOT_FOUND, ShellCommandError } from '@ionic/cli-framework';
import chalk from 'chalk';

import { Command } from '../../lib/command';
import { FatalException } from '../../lib/errors';

export abstract class SSLBaseCommand extends Command {
  async checkForOpenSSL() {
    try {
      await this.env.shell.run('openssl', ['version'], { stdio: 'ignore', showCommand: false, fatalOnNotFound: false });
    } catch (e) {
      if (!(e instanceof ShellCommandError && e.code === ERROR_SHELL_COMMAND_NOT_FOUND)) {
        throw e;
      }

      this.env.log.warn('OpenSSL not found on your computer.'); // TODO: more helpful message

      throw new FatalException(`Command not found: ${chalk.bold('openssl')}`);
    }
  }
}
