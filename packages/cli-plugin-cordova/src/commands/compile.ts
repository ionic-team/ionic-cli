import * as chalk from 'chalk';
import {
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  CommandPreRun,
  validators,
} from '@ionic/cli-utils';

import { filterArgumentsForCordova } from '../lib/utils/cordova';
import { resetConfigXmlContentSrc } from '../lib/utils/configXmlUtils';
import { CordovaCommand } from './base';

@CommandMetadata({
  name: 'compile',
  type: 'project',
  description: 'Compile native platform code',
  exampleCommands: ['ios'],
  inputs: [
    {
      name: 'platform',
      description: `The platform to compile: ${chalk.green('ios')}, ${chalk.green('android')}`,
    }
  ],
})
export class CompileCommand extends CordovaCommand implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    await this.checkForAssetsFolder();

    if (!inputs[0]) {
      const response = await this.env.prompt({
        name: 'platform',
        message: `What platform would you like to compile ${chalk.green('ios')}, ${chalk.green('android')}:`
      });

      inputs[0] = response['platform'];
    }

    await this.checkForPlatformInstallation(inputs[0]);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    // ensure the content node was set back to its original
    await resetConfigXmlContentSrc(this.env.project.directory);
    await this.runCordova(filterArgumentsForCordova(this.metadata, inputs, options));
  }
}
