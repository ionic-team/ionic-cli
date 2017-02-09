import * as opn from 'opn';
import {
  getIonicInfo,
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata
} from '@ionic/cli-utils';

/**
 * Metadata about the docs command
 */
@CommandMetadata({
  name: 'docs',
  description: 'Opens up the documentation website for this projects version of Ionic',
})
export class DocsCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const ionicInfo = await getIonicInfo();

    opn(`http://ionicframework.com/docs/v${ionicInfo['version'].charAt(0)}/${ionicInfo['version']}/api`);
  }
}
