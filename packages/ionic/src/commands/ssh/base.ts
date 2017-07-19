import * as chalk from 'chalk';

import {
  Command,
  ERROR_SHELL_COMMAND_NOT_FOUND,
} from '@ionic/cli-utils';

export class SSHBaseCommand extends Command {
  async checkForOpenSSH() {
    try {
      await this.env.shell.run('ssh', ['-V'], { showCommand: false, fatalOnNotFound: false });
    } catch (e) {
      if (e !== ERROR_SHELL_COMMAND_NOT_FOUND) {
        throw e;
      }

      this.env.log.error(`Command not found: ${chalk.bold('ssh')}`);
      this.env.log.warn('OpenSSH not found on your computer.'); // TODO: more helpful message
      return 1;
    }
  }
}
