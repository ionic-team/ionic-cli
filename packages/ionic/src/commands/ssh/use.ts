import * as path from 'path';

import * as chalk from 'chalk';

import {
  BACKEND_PRO,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  fileToString,
  fsWriteFile,
  prettyPath,
  validators
} from '@ionic/cli-utils';

import { SSHBaseCommand } from './base';
import { load } from '../../lib/modules';
import { ERROR_SSH_INVALID_PRIVKEY, ERROR_SSH_MISSING_PRIVKEY, validatePrivateKey } from '../../lib/ssh';
import { ensureSSHConfigHostAndKeyPath, getSSHConfigPath } from '../../lib/ssh-config';
import { diffPatch } from '../../lib/diff';

@CommandMetadata({
  name: 'use',
  type: 'global',
  backends: [BACKEND_PRO],
  description: 'Set your active Ionic SSH key',
  inputs: [
    {
      name: 'key-path',
      description: 'Location of private key file to use',
      validators: [validators.required],
    },
  ],
})
export class SSHUseCommand extends SSHBaseCommand {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
    const keyPath = path.resolve(inputs[0]);

    try {
      await validatePrivateKey(keyPath);
    } catch (e) {
      if (e === ERROR_SSH_MISSING_PRIVKEY) {
        this.env.log.error(
          `${chalk.bold(keyPath)} does not appear to exist. Please specify a valid SSH private key.\n` +
          `If you are having issues, try using ${chalk.green('ionic ssh setup')}.`
        );
      } else if (e === ERROR_SSH_INVALID_PRIVKEY) {
        this.env.log.error(
          `${chalk.bold(keyPath)} does not appear to be a valid SSH private key. (Missing '-----BEGIN RSA PRIVATE KEY-----' header.)\n` +
          `If you are having issues, try using ${chalk.green('ionic ssh setup')}.`
        );
      } else {
        throw e;
      }

      return 1;
    }

    const SSHConfig = load('ssh-config');
    const sshConfigPath = getSSHConfigPath();
    const config = await this.env.config.load();
    const text1 = await fileToString(sshConfigPath);
    const conf = SSHConfig.parse(text1);
    await ensureSSHConfigHostAndKeyPath(conf, config.git, keyPath);
    const text2 = SSHConfig.stringify(conf);

    if (text1 === text2) {
      this.env.log.info(`${chalk.bold(keyPath)} is already your active SSH key.`);
      return;
    } else {
      const diff = diffPatch(sshConfigPath, text1, text2);

      this.env.log.msg(diff);

      const confirm = await this.env.prompt({
        type: 'confirm',
        name: 'confirm',
        message: `May we make the above change(s) to '${prettyPath(sshConfigPath)}'?`
      });

      if (!confirm) {
        // TODO: link to docs about manual git setup
        return 1;
      }
    }

    await fsWriteFile(sshConfigPath, text2, { encoding: 'utf8', mode: 0o600 });

    this.env.log.ok(`Your active Ionic SSH key has been set to ${chalk.bold(keyPath)}!`);
  }
}
