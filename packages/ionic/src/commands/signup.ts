import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';

export class SignupCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'signup',
      type: 'global',
      summary: 'Create an account for Ionic Pro',
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const opn = await import('opn');
    const dashUrl = await this.env.config.getDashUrl();

    await opn(`${dashUrl}/signup?source=cli`, { wait: false });

    this.env.log.ok('Launched signup form in your browser!');
  }
}
