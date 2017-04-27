import * as chalk from 'chalk';

import {
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  CommandPreInputsPrompt,
  normalizeOptionAliases,
} from '@ionic/cli-utils';

import { KnownPlatform } from '../definitions';
import { gatherArgumentsForCordova } from '../lib/utils/cordova';
import { resetConfigXmlContentSrc } from '../lib/utils/configXmlUtils';
import { addDefaultImagesToProjectResources } from '../lib/resources';
import { getProjectPlatforms } from '../lib/utils/setup';
import { CordovaCommand } from './base';

@CommandMetadata({
  name: 'platform',
  type: 'project',
  description: 'Add or remove a platform target for building an Ionic app',
  exampleCommands: ['add android'],
  inputs: [
    {
      name: 'action',
      description: `${chalk.green('add')}, ${chalk.green('remove')}, or ${chalk.green('update')} a platform; ${chalk.green('list')} all project platforms`,
    },
    {
      // TODO: fix words to use the action above, not just add
      name: 'platform',
      description: `The platform that you would like to add (e.g. ${chalk.green('ios')}, ${chalk.green('android')})`,
      prompt: {
        message: `What platform would you like to add (${chalk.green('ios')}, ${chalk.green('android')}):`,
      },
    }
  ],
  options: [
    {
      name: 'noresources',
      description: `Do not add default Ionic icons and splash screen resources (corresponds to ${chalk.green('add')})`,
      type: Boolean,
      default: false,
      aliases: ['r']
    },
  ]
})
export class PlatformCommand extends CordovaCommand implements CommandPreInputsPrompt {
  async preInputsPrompt(inputs: CommandLineInputs): Promise<void | number> {
    inputs[0] = (typeof inputs[0] === 'undefined') ? 'list' : inputs[0];
    inputs[0] = (inputs[0] === 'rm') ? 'remove' : inputs[0];
    inputs[0] = (inputs[0] === 'ls') ? 'list' : inputs[0];

    // If the action is list then lets just end here.
    if (inputs[0] === 'list') {
      const response = await this.runCordova(['platform', 'list']);
      this.env.log.msg(response);
      return 0;
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [ action, platformName ] = inputs;

    this.checkForMac(platformName);

    // ensure the content node was set back to its original src
    await resetConfigXmlContentSrc(this.env.project.directory);

    const platforms = await getProjectPlatforms(this.env.project.directory);

    if (action === 'add' && platforms.includes(platformName)) {
      this.env.log.ok(`Platform ${platformName} already exists.`);
      return;
    }

    const normalizedOptions = normalizeOptionAliases(this.metadata, options);
    await this.runCordova(gatherArgumentsForCordova(this.metadata, inputs, normalizedOptions));

    if (action === 'add' && !(options['noresources']) && ['ios', 'android', 'wp8'].includes(platformName)) {
      this.env.tasks.next(`Copying default image resources into ${chalk.bold('./resources/' + platformName)}`);
      await addDefaultImagesToProjectResources(this.env.project.directory, <KnownPlatform>platformName);
    }

    this.env.tasks.end();
  }
}
