import * as opn from 'opn';
import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata
} from '@ionic/cli-utils';

/**
 * Metadata about the docs command
 */
@CommandMetadata({
  name: 'signup',
  type: 'global',
  description: 'Create an Ionic account',
})
export class SignupCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const config = await this.env.config.load();
    opn(`${config.urls.dash}/signup`, { wait: false });
    this.env.log.ok('Launched signup form in your browser!');
  }
}
