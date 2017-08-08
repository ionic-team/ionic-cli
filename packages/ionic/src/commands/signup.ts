import { BACKEND_LEGACY, CommandLineInputs, CommandLineOptions } from '@ionic/cli-utils';
import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';

@CommandMetadata({
  name: 'signup',
  type: 'global',
  backends: [BACKEND_LEGACY],
  description: 'Create an Ionic account',
})
export class SignupCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const opn = await import('opn');
    const config = await this.env.config.load();

    opn(`${config.urls.dash}/signup`, { wait: false });

    this.env.log.ok('Launched signup form in your browser!');
  }
}
