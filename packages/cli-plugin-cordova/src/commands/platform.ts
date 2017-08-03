import * as chalk from 'chalk';

import {
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  CommandPreRun,
  contains,
  validate,
  validators,
} from '@ionic/cli-utils';

import { KnownPlatform } from '../definitions';
import { filterArgumentsForCordova } from '../lib/utils/cordova';
import { ConfigXml } from '../lib/utils/configXml';
import { RESOURCES, addDefaultImagesToProjectResources } from '../lib/resources';
import { getProjectPlatforms } from '../lib/utils/setup';
import { CordovaCommand } from './base';

@CommandMetadata({
  name: 'cordova platform',
  type: 'project',
  description: 'Manage Cordova platform targets',
  longDescription: `
Like running ${chalk.green('cordova platform')} directly, but adds default Ionic icons and splash screen resources (during ${chalk.green('add')}) and provides friendly checks.
  `,
  exampleCommands: ['', 'add ios', 'add android', 'rm ios'],
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

    validate(inputs[0], 'action', [contains(['add', 'remove', 'update', 'ls', 'check', 'save'], {})]);

    // If the action is list, check, or save, then just end here.
    if (['ls', 'check', 'save'].includes(inputs[0])) {
      const response = await this.runCordova(['platform', inputs[0]]);
      this.env.log.msg(response);
      return 0;
    }

    if (!inputs[1]) {
      const platform = await this.env.prompt({
        type: 'input',
        name: 'platform',
        message: `What platform would you like to ${inputs[0]} ${chalk.green('ios')}, ${chalk.green('android')}:`,
      });

      inputs[1] = platform.trim();
    }

    validate(inputs[1], 'platform', [validators.required]);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [ action, platformName ] = inputs;

    const conf = await ConfigXml.load(this.env.project.directory);
    await conf.resetContentSrc();
    await conf.save();

    const platforms = await getProjectPlatforms(this.env.project.directory);

    if (action === 'add' && platforms.includes(platformName)) {
      this.env.log.info(`Platform ${platformName} already exists.`);
      return;
    }

    const optionList = filterArgumentsForCordova(this.metadata, inputs, options);

    if ((action === 'add' || action === 'remove') && !optionList.includes('--save')) {
      optionList.push('--save');
    }

    const response = await this.runCordova(optionList);
    this.env.log.msg(response);

    if (action === 'add' && !(options['noresources']) && ['ios', 'android', 'wp8'].includes(platformName)) {
      this.env.tasks.next(`Copying default image resources into ${chalk.bold('./resources/' + platformName)}`);
      await addDefaultImagesToProjectResources(this.env.project.directory, <KnownPlatform>platformName);
      const conf = await ConfigXml.load(this.env.project.directory);
      await conf.ensurePlatformImages(platformName, RESOURCES[platformName]);
      await conf.save();
    }

    this.env.tasks.end();
  }
}
