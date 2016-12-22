import * as os from 'os';
import * as path from 'path';

import * as chalk from 'chalk';

import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  indent,
  prettyPath,
  runCommand
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'setup',
  description: 'Setup your Ionic SSH keys automatically',
  options: [
    {
      name: 'yes',
      description: 'Answer yes to all confirmation prompts',
      aliases: ['y'],
      type: Boolean
    }
  ],
  isProjectTask: false
})
export class SSHSetupCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
    const sshconfigPath = path.resolve(os.homedir(), '.ssh', 'config');
    const sshPath = path.resolve(os.homedir(), '.ssh');
    const keyPath = path.resolve(sshPath, 'ionic_rsa');
    const pubkeyPath = path.resolve(sshPath, 'ionic_rsa.pub');
    const skipPrompts = options['yes'];

    this.env.log.msg('The automatic SSH setup will do the following:\n'
                   + `${indent()}- Generate SSH key pair with OpenSSH.\n`
                   + `${indent()}- Upload the generated SSH public key to our server, registering it on your account.\n`
                   + `${indent()}- Modify your SSH config (${chalk.bold(prettyPath(sshconfigPath))}) to use the generated SSH private key for our server(s).`);

    // TODO: link to docs about manual git setup

    if (!skipPrompts) {
      const confirmation = await this.env.inquirer.prompt({
        type: 'confirm',
        name: 'apply',
        message: 'May we proceed?'
      });

      if (!confirmation['apply']) {
        return 1;
      }
    }

    await runCommand(this.env, [
      'generate',
      '--key-path', keyPath,
      '--pubkey-path', pubkeyPath,
      skipPrompts ? '-y' : ''
    ]);

    await runCommand(this.env, [
      'add',
      pubkeyPath
    ]);

    await runCommand(this.env, [
      'use',
      keyPath,
      skipPrompts ? '-y' : ''
    ]);
  }
}
