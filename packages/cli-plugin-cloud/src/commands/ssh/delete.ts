import * as chalk from 'chalk';

import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  validators
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'delete',
  description: 'Delete an SSH public key on Ionic',
  aliases: ['remove', 'rm'],
  inputs: [
    {
      name: 'key-id',
      description: 'The ID (annotation/comment) of the public key to delete',
      validators: [validators.required]
    }
  ]
})
export class SSHDeleteCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const id = inputs[0];

    const req = this.env.client.make('DELETE', `/sshkeys/${id}`)
      .set('Authorization', `Bearer ${await this.env.session.getUserToken()}`);
    await this.env.client.do(req);

    this.env.log.ok(`Your public key (${chalk.bold(id)}) has been deleted from Ionic.`);
  }
}
