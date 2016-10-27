import * as path from 'path';

import * as chalk from 'chalk';

import {
  APIResponse,
  APIResponseSuccess,
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  isAPIResponseSuccess,
  prettyPath,
  promisify,
  validators
} from '@ionic/cli';

import { parsePublicKeyFile } from '../../utils/ssh';

interface SSHAddResponse extends APIResponseSuccess {
  data: {
    pubkey: string;
    id: string;
    created: string;
    updated: string;
  };
}

function isSSHAddResponse(r: APIResponse): r is SSHAddResponse {
  const res: SSHAddResponse = <SSHAddResponse>r;
  return isAPIResponseSuccess(r)
    && typeof res.data.pubkey === 'string'
    && typeof res.data.id === 'string'
    && typeof res.data.created === 'string'
    && typeof res.data.updated === 'string';
}

@CommandMetadata({
  name: 'add',
  description: 'Add an SSH public key to Ionic',
  inputs: [
    {
      name: 'pubkey-path',
      description: 'Location of public key file to add to Ionic',
      validators: [validators.required]
    }
  ],
  isProjectTask: false
})
export class SSHAddCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const pubkeyPath = path.resolve(inputs[0]);
    const [pubkey, _1, _2, id] = await parsePublicKeyFile(pubkeyPath);

    const req = this.env.client.make('PUT', `/apps/sshkeys/${id}`)
      .set('Authorization', `Bearer ${await this.env.session.getToken('user')}`)
      .send({ pubkey });
    const res = await this.env.client.do(req);

    if (!isSSHAddResponse(res)) {
      throw this.exitAPIFormat(req, res);
    }

    const words = res.meta.status === 201 ? 'added to' : 'updated on';

    this.env.log.info(`Your public key (${chalk.bold(res.data.id)}) has been ${words} Ionic!`);
  }
}
