import * as fs from 'fs';
import * as path from 'path';

import * as chalk from 'chalk';

import {
  APIResponse,
  APIResponseSuccess,
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  indent,
  isAPIResponseSuccess,
  prettyPath,
  promisify
} from '@ionic/cli';

const fsWriteFile = promisify<void, string, any, { encoding?: string; mode?: number; flag?: string; }>(fs.writeFile);

interface SSHGenerateResponse extends APIResponseSuccess {
  data: {
    key: string,
    pubkey: string
  };
}

function isSSHGenerateResponse(r: APIResponse): r is SSHGenerateResponse {
  const res: SSHGenerateResponse = <SSHGenerateResponse>r;
  return isAPIResponseSuccess(r) && typeof res.data.key === 'string' && typeof res.data.pubkey === 'string';
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
export class SSHGenerateCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const keyPath = path.resolve(options['key-path'] ? String(options['key-path']) : 'id_rsa');
    const pubkeyPath = path.resolve(options['pubkey-path'] ? String(options['pubkey-path']) : 'id_rsa.pub');

    const req = this.env.client.make('POST', '/apps/sshkeys/generate')
      .set('Authorization', `Bearer ${await this.env.session.getToken('user')}`)
      .send({});
    const res = await this.env.client.do(req);

    if (!isSSHGenerateResponse(res)) {
      throw this.exitAPIFormat(req, res);
    }

    this.env.log.ok('Generated SSH keys.');

    await Promise.all([
      fsWriteFile(keyPath, res.data.key, { encoding: 'utf8', mode: 0o600 }),
      fsWriteFile(pubkeyPath, res.data.pubkey, { encoding: 'utf8', mode: 0o644 })
    ]);

    this.env.log.ok('A new pair of SSH keys has been downloaded to your computer!\n'
                  + `Private Key (${chalk.bold(prettyPath(keyPath))}): Keep this in a safe spot (such as ${chalk.bold('~/.ssh/')}).\n`
                  + `Public Key (${chalk.bold(prettyPath(pubkeyPath))}): Give this to all your friends!`);
  }


  }
}
