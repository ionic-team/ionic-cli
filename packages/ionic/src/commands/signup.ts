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
  description: 'Create an Ionic account',
})
export class SignupCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    opn(`https://apps.ionic.io/signup`, { wait: false });
  }
}
