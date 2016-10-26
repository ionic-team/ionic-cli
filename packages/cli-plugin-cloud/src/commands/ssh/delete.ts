import * as chalk from 'chalk';

import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  ICommand,
  validators
} from '@ionic/cli';

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
  ],
  isProjectTask: false
})
export class SSHDeleteCommand extends Command implements ICommand {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const id = inputs[0];

    const req = this.env.client.make('DELETE', `/apps/sshkeys/${id}`)
      .set('Authorization', `Bearer ${await this.env.session.getToken('user')}`);
    await this.env.client.do(req);

    this.env.log.info(`Your public key (${chalk.bold(id)}) has been deleted from Ionic.`);
  }
}
