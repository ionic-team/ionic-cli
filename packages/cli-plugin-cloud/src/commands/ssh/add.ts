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
  ICommand,
  isAPIResponseSuccess,
  prettyPath,
  promisify,
  validators
} from '@ionic/cli';

const fsReadFile = promisify<string, string, string>(fs.readFile);
const fsStat = promisify<fs.Stats, string>(fs.stat);

interface SSHAddResponse extends APIResponseSuccess {
  data: {
    pubkey: string;
    id: string;
    created: string;
  };
}

function isSSHAddResponse(r: APIResponse): r is SSHAddResponse {
  const res: SSHAddResponse = <SSHAddResponse>r;
  return isAPIResponseSuccess(r)
    && typeof res.data.pubkey === 'string'
    && typeof res.data.id === 'string'
    && typeof res.data.created === 'string';
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
export class SSHAddCommand extends Command implements ICommand {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const pubkeyPath = path.resolve(inputs[0]);
    const [isValid, pubkey, id] = await this.parsePublicKey(pubkeyPath);

    if (!isValid) {
      return;
    }

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

  async parsePublicKey(pubkeyPath: string): Promise<[boolean, string, string]> {
    try {
      await fsStat(pubkeyPath);
    } catch (e) {
      if (e.code === 'ENOENT') {
        this.env.log.error(`${chalk.bold(pubkeyPath)} does not appear to exist. Please specify a valid SSH public key.\n`
                         + `If you are having issues, try using '${chalk.bold('ionic cloud:ssh setup')}'.`);
        return [false, '', ''];
      }

      throw e;
    }

    const f = (await fsReadFile(pubkeyPath, 'utf8')).trim();
    const r = /^ssh-[r|d]sa\s[A-z0-9+\/]+\s?(.+)?$/.exec(f);

    if (!r) {
      this.env.log.error(`${chalk.bold(prettyPath(pubkeyPath))} does not appear to be a valid SSH public key. (Not in ${chalk.bold('authorized_keys')} file format.)\n`
                       + `If you are having issues, try using '${chalk.bold('ionic cloud:ssh setup')}'.`);
      return [false, '', ''];
    }

    r[1] = r[1].trim();

    if (!r[1]) {
      this.env.log.error(`${chalk.bold(prettyPath(pubkeyPath))} is missing an annotation/comment after the public key.\n`
                       + `If you are using ${chalk.bold('ssh-keygen')}, try using the ${chalk.bold('-C')} flag.\n`
                       + `If you are having issues, try using '${chalk.bold('ionic cloud:ssh setup')}'.`);
      return [false, '', ''];
    }

    if (r[1].match(/\s/)) {
      this.env.log.error(`${chalk.bold(prettyPath(pubkeyPath))} has an annotation/comment ('${chalk.bold(r[1])}') that has whitespace.\n`
                       + `Try changing the comment to something more like an identifier, perhaps '${chalk.bold(r[1].replace(/\s/g, '-').toLowerCase())}'?\n`
                       + `If you are having issues, try using '${chalk.bold('ionic cloud:ssh setup')}'.`);
      return [false, '', ''];
    }

    return [true, f, r[1]];
  }
}
