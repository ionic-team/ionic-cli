import * as chalk from 'chalk';

import {
  CommandLineInputs,
  CommandLineOptions,
  CommandPreRun,
  CommandMetadata,
} from '@ionic/cli-utils';

import { gatherArgumentsForCordova } from '../lib/utils/cordova';
import { getProjectPlatforms, installPlatform } from '../lib/utils/setup';
import { resetConfigXmlContentSrc } from '../lib/utils/configXmlUtils';
import { CordovaCommand } from './base';

@CommandMetadata({
  name: 'prepare',
  type: 'project',
  description: 'Transform metadata to platform manifests and copies assets to Cordova platforms',
})
export class PrepareCommand extends CordovaCommand implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    // ensure the content node was set back to its original src
    await resetConfigXmlContentSrc(this.env.project.directory);
    const platforms = await getProjectPlatforms(this.env.project.directory);

    if (platforms.length === 0) {
      const promptResults = await this.env.prompt({
        message: `You have no Cordova platforms added! Which platform would you like to install (${chalk.green('ios')}, ${chalk.green('android')}):`,
        type: 'input',
        name: 'platform',
      });

      await installPlatform(this.env, promptResults['platform']);
    }

    await this.runCordova(gatherArgumentsForCordova(this.metadata, inputs, options));
  }
}
