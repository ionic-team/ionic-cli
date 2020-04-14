import { ERROR_COMMAND_NOT_FOUND, SubprocessError } from '@ionic/utils-subprocess';

import { strong } from '../../lib/color';
import { Command } from '../../lib/command';
import { FatalException } from '../../lib/errors';

export abstract class SSHBaseCommand extends Command {
  async checkForOpenSSH() {
    try {
      await this.env.shell.run('ssh', ['-V'], { stdio: 'ignore', showCommand: false, fatalOnNotFound: false });
    } catch (e) {
      if (!(e instanceof SubprocessError && e.code === ERROR_COMMAND_NOT_FOUND)) {
        throw e;
      }

      this.env.log.warn('OpenSSH not found on your computer.'); // TODO: more helpful message

      throw new FatalException(`Command not found: ${strong('ssh')}`);
    }
  }
}
