import {
  getIonicInfo,
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
} from '@ionic/cli-utils';

import { load } from '../lib/modules';

/**
 * Metadata about the docs command
 */
@CommandMetadata({
  name: 'docs',
  description: 'Opens up the Ionic documentation website',
  requiresProject: true
})
export class DocsCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const ionicInfo = await getIonicInfo();

    const opn = load('opn');
    opn(`http://ionicframework.com/docs/v${ionicInfo['version'].charAt(0)}/${ionicInfo['version']}/api`, { wait: false });
  }
}
