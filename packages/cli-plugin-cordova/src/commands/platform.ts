import * as chalk from 'chalk';

import {
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  CommandPreRun,
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
      description: `${chalk.green('add')}, ${chalk.green('remove')}, or ${chalk.green('update')} a platform; ${chalk.green('ls')}, ${chalk.green('check')}, or ${chalk.green('save')} all project platforms`,
    },
    {
      name: 'platform',
      description: `The platform that you would like to add (e.g. ${chalk.green('ios')}, ${chalk.green('android')})`,
    }
  ],
  options: [
    {
      name: 'noresources',
      description: `Do not add default Ionic icons and splash screen resources (corresponds to ${chalk.green('add')})`,
      type: Boolean,
      default: false,
      aliases: ['r'],
    },
  ]
})
export class PlatformCommand extends CordovaCommand implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
    await this.checkForAssetsFolder();

    inputs[0] = (typeof inputs[0] === 'undefined') ? 'ls' : inputs[0];
    inputs[0] = (inputs[0] === 'rm') ? 'remove' : inputs[0];
    inputs[0] = (inputs[0] === 'list') ? 'ls' : inputs[0];

    // If the action is list, check, or save, then just end here.
    if (['ls', 'check', 'save'].includes(inputs[0])) {
      const response = await this.runCordova(['platform', inputs[0]]);
      this.env.log.msg(response);
      return 0;
    }

    if (!inputs[1]) {
      const response = await this.env.prompt({
        name: 'platform',
        message: `What platform would you like to ${inputs[0]} ${chalk.green('ios')}, ${chalk.green('android')}:`,
      });

      inputs[1] = response['platform'];
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [ action, platformName ] = inputs;

    // ensure the content node was set back to its original src
    await resetConfigXmlContentSrc(this.env.project.directory);

    const platforms = await getProjectPlatforms(this.env.project.directory);

    if (action === 'add' && platforms.includes(platformName)) {
      this.env.log.ok(`Platform ${platformName} already exists.`);
      return;
    }

    const normalizedOptions = normalizeOptionAliases(this.metadata, options);
    const optionList = gatherArgumentsForCordova(this.metadata, inputs, normalizedOptions);

    if ((action === 'add' || action === 'remove') && !optionList.includes('--save')) {
      optionList.push('--save');
    }

    const response = await this.runCordova(optionList);
    this.env.log.msg(response);

    if (action === 'add' && !(options['noresources']) && ['ios', 'android', 'wp8'].includes(platformName)) {
      this.env.tasks.next(`Copying default image resources into ${chalk.bold('./resources/' + platformName)}`);
      await addDefaultImagesToProjectResources(this.env.project.directory, <KnownPlatform>platformName);
    }

    this.env.tasks.end();
  }
}
