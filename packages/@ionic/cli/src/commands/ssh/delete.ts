import { validators } from '@ionic/cli-framework';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '../../definitions';
import { input, strong } from '../../lib/color';

import { SSHBaseCommand } from './base';

export class SSHDeleteCommand extends SSHBaseCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'delete',
      type: 'global',
      summary: 'Delete an SSH public key from Ionic',
      inputs: [
        {
          name: 'key-id',
          summary: 'The ID of the public key to delete',
          validators: [validators.required],
        },
      ],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { SSHKeyClient } = await import('../../lib/ssh');

    if (!inputs[0]) {
      const user = this.env.session.getUser();
      const token = await this.env.session.getUserToken();

      const sshkeyClient = new SSHKeyClient({ client: this.env.client, user, token });
      const paginator = sshkeyClient.paginate();

      const [ r ] = paginator;
      const res = await r;

      if (res.data.length === 0) {
        this.env.log.warn(`No SSH keys found. Use ${input('ionic ssh add')} to add keys to Ionic.`);
      }

      inputs[0] = await this.env.prompt({
        type: 'list',
        name: 'id',
        message: 'Which SSH keys would you like to delete from Ionic?',
        choices: res.data.map(key => ({
          name: `${key.fingerprint} ${key.name} ${key.annotation}`,
          value: key.id,
        })),
      });
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { SSHKeyClient } = await import('../../lib/ssh');

    const [ id ] = inputs;

    const user = this.env.session.getUser();
    const token = await this.env.session.getUserToken();

    const sshkeyClient = new SSHKeyClient({ client: this.env.client, user, token });
    await sshkeyClient.delete(id);

    this.env.log.ok(`Your public key (${strong(id)}) has been removed from Ionic.`);
  }
}
