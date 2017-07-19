import * as path from 'path';

import * as chalk from 'chalk';

import {
  BACKEND_PRO,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  ERROR_FILE_NOT_FOUND,
  FatalException,
  createFatalAPIFormat,
  isSSHKeyResponse,
  isSuperAgentError,
  prettyPath,
  validators,
} from '@ionic/cli-utils';

import { SSHBaseCommand } from './base';

import {
  ERROR_SSH_ANNOTATION_INVALID_WHITESPACE,
  ERROR_SSH_ANNOTATION_MISSING,
  ERROR_SSH_INVALID_PUBKEY,
  parsePublicKeyFile,
} from '../../lib/ssh';

@CommandMetadata({
  name: 'add',
  type: 'global',
  backends: [BACKEND_PRO],
  description: 'Add an SSH public key to Ionic',
  inputs: [
    {
      name: 'pubkey-path',
      description: 'Location of public key file to add to Ionic',
      validators: [validators.required],
    }
  ],
})
export class SSHAddCommand extends SSHBaseCommand {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
    const pubkeyPath = path.resolve(inputs[0]);
    const pubkeyName = prettyPath(pubkeyPath);

    let pubkey: string;

    try {
      [ pubkey, , , ] = await parsePublicKeyFile(pubkeyPath);
    } catch (e) {
      if (e === ERROR_FILE_NOT_FOUND) {
        throw new FatalException(
          `${chalk.bold(prettyPath(pubkeyPath))} does not appear to exist. Please specify a valid SSH public key.\n` +
          `If you are having issues, try using ${chalk.green('ionic ssh setup')}.`
        );
      } else if (e === ERROR_SSH_INVALID_PUBKEY) {
        throw new FatalException(
          `${chalk.bold(pubkeyName)} does not appear to be a valid SSH public key. (Not in ${chalk.bold('authorized_keys')} file format.)\n` +
          `If you are having issues, try using ${chalk.green('ionic ssh setup')}.`
        );
      } else if (e === ERROR_SSH_ANNOTATION_MISSING) {
        throw new FatalException(
          `${chalk.bold(pubkeyName)} is missing an annotation/comment after the public key.\n` +
          `If you are using ${chalk.green('ssh-keygen')}, try using the ${chalk.green('-C')} flag.\n` +
          `If you are having issues, try using ${chalk.green('ionic ssh setup')}.`
        );
      } else if (e === ERROR_SSH_ANNOTATION_INVALID_WHITESPACE) {
        throw new FatalException(
          `${chalk.bold(pubkeyName)} has an annotation/comment that has whitespace.\n` +
          `Try changing the comment to something more like an identifier.\n` +
          `If you are having issues, try using ${chalk.green('ionic ssh setup')}.`
        );
      }

      throw e;
    }

    const config = await this.env.config.load();
    const token = await this.env.session.getUserToken();

    const req = this.env.client.make('POST', `/users/${config.user.id}/sshkeys`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pubkey });

    try {
      const res = await this.env.client.do(req);

      if (!isSSHKeyResponse(res)) {
        throw createFatalAPIFormat(req, res);
      }

      const words = res.meta.status === 201 ? 'added to' : 'updated on';

      this.env.log.ok(`Your public key (${chalk.bold(res.data.id)}) has been ${words} Ionic!`);
    } catch (e) {
      if (isSuperAgentError(e)) {
        if (e.response.status === 409) {
          this.env.log.info('Pubkey already added to Ionic.');
          return 0;
        }
      }

      throw e;
    }
  }
}
