import * as fs from 'fs';

import {
  APIResponseSuccess,
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  ICommand,
  ICommandMap,
  TaskChain,
  promisify
} from '@ionic/cli';

const fsWriteFile = promisify<void, string, string>(fs.writeFile);

interface SSHGenerateResponse extends APIResponseSuccess {
  data: {
    key: string,
    pubkey: string
  }
}

function isSSHGenerateResponse(r: SSHGenerateResponse): r is SSHGenerateResponse {
  return r.data.key !== undefined
    && r.data.pubkey !== undefined;
}

@CommandMetadata({
  name: 'generate',
  description: 'Generates a private and public SSH key pair',
  options: [
    {
      name: 'key-path',
      description: 'Destination of private key file',
      default: 'id_rsa'
    },
    {
      name: 'pubkey-path',
      description: 'Destination of public key file',
      default: 'id_rsa.pub'
    }
  ],
  isProjectTask: false
})
export class SSHGenerateCommand extends Command implements ICommand {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const keyPath = options['key-path'] ? String(options['key-path']) : 'id_rsa';
    const pubkeyPath = options['pubkey-path'] ? String(options['pubkey-path']) : 'id_rsa.pub';

    const tasks = new TaskChain();

    tasks.next('generating ssh keys');

    const req = this.env.client.make('POST', '/apps/sshkeys/generate').send({});
    const res = await this.env.client.do(req);

    if (!this.env.client.is<SSHGenerateResponse>(res, isSSHGenerateResponse)) {
      throw 'todo'; // TODO
    }

    tasks.next('writing ssh keys');

    await Promise.all([
      fsWriteFile(keyPath, res.data.key),
      fsWriteFile(pubkeyPath, res.data.pubkey)
    ]);

    tasks.end();
  }
}
