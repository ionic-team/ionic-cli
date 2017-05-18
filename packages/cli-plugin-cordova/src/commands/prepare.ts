import * as chalk from 'chalk';

import {
  CommandLineInputs,
  CommandLineOptions,
  CommandPreRun,
  CommandMetadata,
} from '@ionic/cli-utils';

import { filterArgumentsForCordova } from '../lib/utils/cordova';
import { installPlatform } from '../lib/utils/setup';
import { getPlatformEngine, resetConfigXmlContentSrc, parseConfigXmlToJson } from '../lib/utils/configXmlUtils';
import { CordovaCommand } from './base';

@CommandMetadata({
  name: 'prepare',
  type: 'project',
  description: 'Transform metadata to platform manifests and copies assets to Cordova platforms',
  inputs: [
    {
      name: 'platform',
      description: `The platform you would like to prepare (e.g. ${chalk.green('ios')}, ${chalk.green('android')})`,
      required: false,
    },
  ]
})
export class PrepareCommand extends CordovaCommand implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    await this.checkForAssetsFolder();
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ platform ] = inputs;

    if (platform) {
      const configJson = await parseConfigXmlToJson(this.env.project.directory);
      const platformEngine = getPlatformEngine(configJson, platform);

      if (!platformEngine) {
        const confirm = await this.env.prompt({
          message: `Platform ${chalk.green(platform)} is not installed! Would you like to install it?`,
          type: 'confirm',
          name: 'confirm',
        });

        if (confirm) {
          await installPlatform(this.env, platform);
        } else {
          throw this.exit(`Can't prepare for ${chalk.green(platform)} unless the platform is installed. Did you mean just ${chalk.green('ionic cordova prepare')}?`);
        }
      }
    }

    // ensure the content node was set back to its original src
    await resetConfigXmlContentSrc(this.env.project.directory);

    await this.env.shell.run('cordova', filterArgumentsForCordova(this.metadata, inputs, options), {});
  }
}
