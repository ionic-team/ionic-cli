import * as chalk from 'chalk';

import {
  BACKEND_PRO,
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  prettyPath,
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'setup',
  type: 'global',
  backends: [BACKEND_PRO],
  description: 'Setup your Ionic SSH keys automatically',
})
export class SSHSetupCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
    const [{ getPrivateKeyPath }, { getSSHConfigPath }] = await Promise.all([import('../../lib/ssh'), import('../../lib/ssh-config')]);

    const sshconfigPath = getSSHConfigPath();
    const keyPath = await getPrivateKeyPath(this.env);
    const pubkeyPath = `${keyPath}.pub`;

    this.env.log.info(
      'The automatic SSH setup will do the following:\n' +
      `1) Generate SSH key pair with OpenSSH.\n` +
      `2) Upload the generated SSH public key to our server, registering it on your account.\n` +
      `3) Modify your SSH config (${chalk.bold(prettyPath(sshconfigPath))}) to use the generated SSH private key for our server(s).`
    );

    // TODO: link to docs about manual git setup

    const confirm = await this.env.prompt({
      type: 'confirm',
      name: 'confirm',
      message: 'May we proceed?',
    });

    if (!confirm) {
      return 1;
    }

    await this.runcmd(['ssh', 'generate', keyPath]);
    await this.runcmd(['ssh', 'add', pubkeyPath]);
    await this.runcmd(['ssh', 'use', keyPath]);
  }
}
