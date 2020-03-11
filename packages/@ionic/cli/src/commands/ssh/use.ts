import { validators } from '@ionic/cli-framework';
import { expandPath, prettyPath } from '@ionic/cli-framework/utils/format';
import { fileToString, writeFile } from '@ionic/utils-fs';

import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../definitions';
import { input, strong } from '../../lib/color';
import { FatalException } from '../../lib/errors';

import { SSHBaseCommand } from './base';

export class SSHUseCommand extends SSHBaseCommand {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'use',
      type: 'global',
      summary: 'Set your active Ionic SSH key',
      description: `
This command modifies the SSH configuration file (${strong('~/.ssh/config')}) to set an active private key for the ${strong('git.ionicjs.com')} host. Read more about SSH configuration by running the ${input('man ssh_config')} command or by visiting online man pages[^ssh-config-docs].

Before making changes, ${input('ionic ssh use')} will print a diff and ask for permission to write the file.
      `,
      footnotes: [
        {
          id: 'ssh-config-docs',
          url: 'https://linux.die.net/man/5/ssh_config',
        },
      ],
      inputs: [
        {
          name: 'key-path',
          summary: 'Location of private key file to use',
          validators: [validators.required],
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { ERROR_SSH_INVALID_PRIVKEY, ERROR_SSH_MISSING_PRIVKEY, validatePrivateKey } = await import('../../lib/ssh');
    const { ensureHostAndKeyPath, getConfigPath } = await import('../../lib/ssh-config');

    const keyPath = expandPath(inputs[0]);

    try {
      await validatePrivateKey(keyPath);
    } catch (e) {
      if (e === ERROR_SSH_MISSING_PRIVKEY) {
        throw new FatalException(
          `${strong(prettyPath(keyPath))} does not appear to exist. Please specify a valid SSH private key.\n` +
          `If you are having issues, try using ${input('ionic ssh setup')}.`
        );
      } else if (e === ERROR_SSH_INVALID_PRIVKEY) {
        throw new FatalException(
          `${strong(prettyPath(keyPath))} does not appear to be a valid SSH private key. (Missing '-----BEGIN RSA PRIVATE KEY-----' header.)\n` +
          `If you are having issues, try using ${input('ionic ssh setup')}.`
        );
      } else {
        throw e;
      }
    }

    const { SSHConfig } = await import('../../lib/ssh-config');
    const sshConfigPath = getConfigPath();
    const text1 = await fileToString(sshConfigPath);
    const conf = SSHConfig.parse(text1);
    ensureHostAndKeyPath(conf, { host: this.env.config.getGitHost(), port: this.env.config.getGitPort() }, keyPath);
    const text2 = SSHConfig.stringify(conf);

    if (text1 === text2) {
      this.env.log.msg(`${strong(prettyPath(keyPath))} is already your active SSH key.`);
      return;
    } else {
      const { diffPatch } = await import('../../lib/diff');
      const diff = await diffPatch(sshConfigPath, text1, text2);

      this.env.log.rawmsg(diff);

      const confirm = await this.env.prompt({
        type: 'confirm',
        name: 'confirm',
        message: `May we make the above change(s) to '${prettyPath(sshConfigPath)}'?`,
      });

      if (!confirm) {
        // TODO: link to docs about manual git setup
        throw new FatalException();
      }
    }

    await writeFile(sshConfigPath, text2, { encoding: 'utf8', mode: 0o600 });

    this.env.log.ok(`Your active Ionic SSH key has been set to ${strong(keyPath)}!`);
  }
}
