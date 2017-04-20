import {
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
} from '@ionic/cli-utils';

import { gatherArgumentsForCordova } from '../lib/utils/cordova';
import { resetConfigXmlContentSrc } from '../lib/utils/configXmlUtils';
import { CordovaPlatformCommand } from './base';

@CommandMetadata({
  name: 'prepare',
  type: 'project',
  description: 'Transform metadata to platform manifests and copies assets to Cordova platforms',
})
export class PrepareCommand extends CordovaPlatformCommand {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    // ensure the content node was set back to its original src
    await resetConfigXmlContentSrc(this.env.project.directory);
    await this.runCordova(gatherArgumentsForCordova(this.metadata, inputs, options));
  }
}
