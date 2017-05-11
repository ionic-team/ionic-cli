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
  inputs: [
    {
      name: 'platform',
      description: `The platform you would like to prepare (e.g. ${chalk.green('ios')}, ${chalk.green('android')})`,
    },
  ]
})
export class PrepareCommand extends CordovaCommand implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [platform] = inputs;

    // ensure the content node was set back to its original src
    await resetConfigXmlContentSrc(this.env.project.directory);
    let platforms = await getProjectPlatforms(this.env.project.directory);
    this.env.log.debug(`platforms=${platforms}`);

    if (platform && !platforms.includes(platform)) {
      const promptResults = await this.env.prompt({
        message: `Platform ${chalk.green(platform)} is not installed! Would you like to install it?`,
        type: 'confirm',
        name: 'install',
      });

      if (promptResults['install']) {
        await installPlatform(this.env, platform);
        platforms = await getProjectPlatforms(this.env.project.directory);
      } else {
        throw this.exit(`Platform ${chalk.green(platform)} not installed.`);
      }
    }

    if (!platforms.includes('android') && !platforms.includes('ios')) {
      const promptResults = await this.env.prompt({
        message: `You have no Cordova platforms added! Which platform would you like to install (${chalk.green('ios')}, ${chalk.green('android')}):`,
        type: 'input',
        name: 'platform',
      });

      let platformToInstall = promptResults['platform'] || '';

      await installPlatform(this.env, platformToInstall.trim());
    }

    await this.runCordova(gatherArgumentsForCordova(this.metadata, inputs, options));
  }
}
