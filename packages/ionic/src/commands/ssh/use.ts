import * as path from 'path';

import chalk from 'chalk';

import { validators } from '@ionic/cli-framework/lib';
import { BACKEND_PRO, CommandLineInputs, CommandLineOptions } from '@ionic/cli-utils';
import { CommandMetadata } from '@ionic/cli-utils/lib/command';
import { fileToString, fsWriteFile } from '@ionic/cli-framework/utils/fs';
import { FatalException } from '@ionic/cli-utils/lib/errors';

import { SSHBaseCommand } from './base';

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
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { prettyPath } = await import('@ionic/cli-utils/lib/utils/format');
    const { ERROR_SSH_INVALID_PRIVKEY, ERROR_SSH_MISSING_PRIVKEY, validatePrivateKey } = await import('@ionic/cli-utils/lib/ssh');
    const { ensureHostAndKeyPath, getConfigPath } = await import('@ionic/cli-utils/lib/ssh-config');

    const keyPath = path.resolve(inputs[0]);

    try {
      await validatePrivateKey(keyPath);
    } catch (e) {
      if (e === ERROR_SSH_MISSING_PRIVKEY) {
        throw new FatalException(
          `${chalk.bold(keyPath)} does not appear to exist. Please specify a valid SSH private key.\n` +
          `If you are having issues, try using ${chalk.green('ionic ssh setup')}.`
        );
      } else if (e === ERROR_SSH_INVALID_PRIVKEY) {
        throw new FatalException(
          `${chalk.bold(keyPath)} does not appear to be a valid SSH private key. (Missing '-----BEGIN RSA PRIVATE KEY-----' header.)\n` +
          `If you are having issues, try using ${chalk.green('ionic ssh setup')}.`
        );
      } else {
        throw e;
      }
    }

    const { SSHConfig } = await import('@ionic/cli-utils/lib/ssh-config');
    const sshConfigPath = getConfigPath();
    const text1 = await fileToString(sshConfigPath);
    const conf = SSHConfig.parse(text1);
    await ensureHostAndKeyPath(conf, { host: await this.env.config.getGitHost(), port: await this.env.config.getGitPort() }, keyPath);
    const text2 = SSHConfig.stringify(conf);

    if (text1 === text2) {
      this.env.log.info(`${chalk.bold(keyPath)} is already your active SSH key.`);
      return;
    } else {
      const { diffPatch } = await import('@ionic/cli-utils/lib/diff');
      const diff = await diffPatch(sshConfigPath, text1, text2);

      this.env.log.msg(diff);

      const confirm = await this.env.prompt({
        type: 'confirm',
        name: 'confirm',
        message: `May we make the above change(s) to '${prettyPath(sshConfigPath)}'?`
      });

      if (!confirm) {
        // TODO: link to docs about manual git setup
        throw new FatalException();
      }
    }

    await fsWriteFile(sshConfigPath, text2, { encoding: 'utf8', mode: 0o600 });

    this.env.log.ok(`Your active Ionic SSH key has been set to ${chalk.bold(keyPath)}!`);
  }
}
