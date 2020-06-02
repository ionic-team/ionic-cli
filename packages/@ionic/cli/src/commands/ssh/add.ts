import { validators } from '@ionic/cli-framework';
import { expandPath, prettyPath } from '@ionic/cli-framework/utils/format';
import { pathAccessible, pathExists } from '@ionic/utils-fs';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '../../definitions';
import { isSuperAgentError } from '../../guards';
import { input, strong } from '../../lib/color';
import { FatalException } from '../../lib/errors';
import { runCommand } from '../../lib/executor';

import { SSHBaseCommand } from './base';

export class SSHAddCommand extends SSHBaseCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'add',
      type: 'global',
      summary: 'Add an SSH public key to Ionic',
      inputs: [
        {
          name: 'pubkey-path',
          summary: 'Location of public key file to add to Ionic',
          validators: [validators.required],
        },
      ],
      options: [
        {
          name: 'use',
          summary: 'Use the newly added key as your default SSH key for Ionic',
          type: Boolean,
        },
      ],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!inputs[0]) {
      const defaultPubkeyPath = path.resolve(os.homedir(), '.ssh', 'id_rsa.pub');
      const defaultPubkeyExists = await pathAccessible(defaultPubkeyPath, fs.constants.R_OK);

      const pubkeyPath = await this.env.prompt({
        type: 'input',
        name: 'pubkeyPath',
        message: 'Enter the location to your public key file to upload to Ionic:',
        default: defaultPubkeyExists ? prettyPath(defaultPubkeyPath) : undefined,
      });

      inputs[0] = pubkeyPath;
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    const { ERROR_SSH_INVALID_PUBKEY, SSHKeyClient, parsePublicKeyFile } = await import('../../lib/ssh');

    const pubkeyPath = expandPath(inputs[0]);
    const pubkeyName = prettyPath(pubkeyPath);

    let pubkey: string;

    try {
      [ pubkey ] = await parsePublicKeyFile(pubkeyPath);
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw new FatalException(
          `${strong(prettyPath(pubkeyPath))} does not appear to exist. Please specify a valid SSH public key.\n` +
          `If you are having issues, try using ${input('ionic ssh setup')}.`
        );
      } else if (e === ERROR_SSH_INVALID_PUBKEY) {
        throw new FatalException(
          `${strong(pubkeyName)} does not appear to be a valid SSH public key. (Not in ${strong('authorized_keys')} file format.)\n` +
          `If you are having issues, try using ${input('ionic ssh setup')}.`
        );
      }

      throw e;
    }

    const user = this.env.session.getUser();
    const token = await this.env.session.getUserToken();
    const sshkeyClient = new SSHKeyClient({ client: this.env.client, token, user });

    try {
      const key = await sshkeyClient.create({ pubkey });
      this.env.log.ok(`Your public key (${strong(key.fingerprint)}) has been added to Ionic!`);
    } catch (e) {
      if (isSuperAgentError(e) && e.response.status === 409) {
        this.env.log.msg('Pubkey already added to Ionic.');
      } else {
        throw e;
      }
    }

    if (pubkeyPath.endsWith('.pub')) {
      let confirm = options['use'];

      if (!confirm) {
        confirm = await this.env.prompt({
          type: 'confirm',
          name: 'confirm',
          message: 'Would you like to use this key as your default for Ionic?',
        });
      }

      if (confirm) {
        const keyPath = pubkeyPath.substring(0, pubkeyPath.length - 4); // corresponding private key, theoretically
        const keyExists = await pathExists(keyPath);

        if (keyExists) {
          await runCommand(runinfo, ['ssh', 'use', prettyPath(keyPath)]);
        } else {
          this.env.log.error(
            `SSH key does not exist: ${strong(prettyPath(keyPath))}.\n` +
            `Please use ${input('ionic ssh use')} manually to use the corresponding private key.`
          );
        }
      }
    }
  }
}
