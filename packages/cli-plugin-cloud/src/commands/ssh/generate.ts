import * as os from 'os';
import * as path from 'path';
import * as chalk from 'chalk';

import {
  APIResponse,
  APIResponseSuccess,
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  fsMkdirp,
  fsStat,
  indent,
  isAPIResponseSuccess,
  prettyPath
} from '@ionic/cli-utils';

interface SlugResponse extends APIResponseSuccess {
  data: string;
}

function isSlugResponse(r: APIResponse): r is SlugResponse {
  const res: SlugResponse = <SlugResponse>r;
  return isAPIResponseSuccess(r) && typeof res.data === 'string';
}

@CommandMetadata({
  name: 'generate',
  description: 'Generates a private and public SSH key pair',
  inputs: [
    {
      name: 'key-path',
      description: 'Destination of private key file'
    }
  ]
})
export class SSHGenerateCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
    const keyPath = inputs[0] ? path.resolve(String(inputs[0])) : path.resolve(os.homedir(), '.ssh', 'ionic_rsa');
    const keyPathDir = path.dirname(keyPath);
    const pubkeyPath = keyPath + '.pub';

    if (!(await this.env.shell.exists('ssh-keygen'))) {
      this.env.log.error('Command not found: ssh-keygen');
      this.env.log.warn('OpenSSH not found on your computer.'); // TODO: more helpful message
      return 1;
    }

    try {
      await fsStat(keyPathDir);
    } catch (e) {
      if (e.code === 'ENOENT') {
        await fsMkdirp(keyPathDir, 0o700);
        this.env.log.ok(`Created ${chalk.bold(prettyPath(keyPathDir))} directory for you.\n`);
      } else {
        throw e;
      }
    }

    const req = this.env.client.make('POST', `/utils/slug`).send({});
    const res = await this.env.client.do(req);

    if (!isSlugResponse(res)) {
      throw this.exitAPIFormat(req, res);
    }

    this.env.log.info(`You will be prompted to provide a ${chalk.bold('passphrase')}, which is `
                    + 'used to protect your private key should you lose it. (If someone has your '
                    + 'private key, they can impersonate you!) Passphrases are recommended, but not required.');

    await this.env.shell.run('ssh-keygen', ['-q', '-t', 'rsa', '-b', '2048', '-C', res.data, '-f', keyPath], { stdio: 'inherit' });

    this.env.log.ok('A new pair of SSH keys has been generated!\n'
                  + `Private Key (${chalk.bold(prettyPath(keyPath))}): Keep this safe!\n`
                  + `Public Key (${chalk.bold(prettyPath(pubkeyPath))}): Give this to all your friends!`);

    this.env.log.info('\nNext steps:\n'
                    + `${indent(4)}- Add your public key to Ionic: ${chalk.bold('ionic cloud:ssh add ' + prettyPath(pubkeyPath))}\n`
                    + `${indent(4)}- Use your private key for secure communication with Ionic: ${chalk.bold('ionic cloud:ssh use ' + prettyPath(keyPath))}`);
  }
}
