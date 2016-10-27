import * as os from 'os';
import * as path from 'path';

import * as chalk from 'chalk';

import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  indent,
  prettyPath
} from '@ionic/cli';

@CommandMetadata({
  name: 'setup',
  description: 'Setup your Ionic SSH keys automatically',
  isProjectTask: false
})
export class SSHSetupCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
    const sshconfigPath = path.resolve(os.homedir(), '.ssh', 'config');
    const sshPath = path.resolve(os.homedir(), '.ssh');
    const keyPath = path.resolve(sshPath, 'ionic_rsa');
    const pubkeyPath = path.resolve(sshPath, 'ionic_rsa.pub');

    this.env.log.msg('The automatic SSH setup will do the following:\n'
                   + `${indent()}- Generate SSH key pair on our server and download them to your computer.\n`
                   + `${indent()}- Upload the generated SSH public key to our server, registering it on your account.\n`
                   + `${indent()}- Modify your SSH config (${chalk.bold(prettyPath(sshconfigPath))}) to use the generated SSH private key for our server(s).`);

    // TODO: link to docs about manual git setup

    const confirmation = await this.env.inquirer.prompt({
      type: 'confirm',
      name: 'apply',
      message: 'May we proceed?'
    });

    if (!confirmation['apply']) {
      return 1;
    }

    await this.cli.run([
      'cloud:ssh',
      'generate',
      '--key-path', keyPath,
      '--pubkey-path', pubkeyPath
    ]);

    await this.cli.run([
      'cloud:ssh',
      'add',
      pubkeyPath
    ]);

    await this.cli.run([
      'cloud:ssh',
      'use',
      keyPath
    ]);
  }
}
