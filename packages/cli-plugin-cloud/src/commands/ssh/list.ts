import * as chalk from 'chalk';

import {
  APIResponse,
  APIResponseSuccess,
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  isAPIResponseSuccess
} from '@ionic/cli-utils';

import { parsePublicKey } from '../../utils/ssh';

interface SSHListResponse extends APIResponseSuccess {
  data: {
    pubkey: string;
    id: string;
    created: string;
    updated: string;
  }[];
}

function isSSHListResponse(r: APIResponse): r is SSHListResponse {
  const res: SSHListResponse = <SSHListResponse>r;
  if (!isAPIResponseSuccess(r) || !Array.isArray(r.data)) {
    return false;
  }

  if (typeof r.data[0] === 'object') {
    return typeof res.data[0].pubkey === 'string'
      && typeof res.data[0].id === 'string'
      && typeof res.data[0].created === 'string'
      && typeof res.data[0].updated === 'string';
  }

  return true;
}

@CommandMetadata({
  name: 'list',
  description: 'List your SSH public keys on Ionic',
  aliases: ['ls'],
  isProjectTask: false
})
export class SSHListCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const req = this.env.client.make('GET', `/sshkeys`)
      .set('Authorization', `Bearer ${await this.env.session.getUserToken()}`);
    const res = await this.env.client.do(req);

    if (!isSSHListResponse(res)) {
      throw this.exitAPIFormat(req, res);
    }

    for (let sshkey of res.data) {
      const [_0, _1, pn, id] = await parsePublicKey(sshkey.pubkey, sshkey.id);
      this.env.log.msg(chalk.bold(id) + ':', this.prettyPublicNumbers(pn));
    }
  }

  prettyPublicNumbers(pn: string): string {
    const cutoff = 30;
    return `${pn.substring(0, cutoff)}...${pn.substring(pn.length - cutoff)}`;
  }
}
