import * as chalk from 'chalk';
import {
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  validators,
} from '@ionic/cli-utils';

import { gatherArgumentsForCordova } from '../lib/utils/cordova';
import { resetConfigXmlContentSrc } from '../lib/utils/configXmlUtils';
import { CordovaPlatformCommand } from './base';

@CommandMetadata({
  name: 'compile',
  type: 'project',
  description: 'Compile native platform code',
  exampleCommands: ['ios'],
  inputs: [
    {
      name: 'platform',
      description: `The platform to emulate: ${chalk.green('ios')}, ${chalk.green('android')}`,
      validators: [validators.required],
      prompt: {
        message: `What platform would you like to compile (${chalk.green('ios')}, ${chalk.green('android')}):`
      }
    }
  ],
})
export class CompileCommand extends CordovaPlatformCommand {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    // ensure the content node was set back to its original
    await resetConfigXmlContentSrc(this.env.project.directory);
    await this.runCordova(gatherArgumentsForCordova(this.metadata, inputs, options));
  }
}
