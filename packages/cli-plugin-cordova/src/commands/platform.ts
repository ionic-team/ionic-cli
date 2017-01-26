import * as chalk from 'chalk';
import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  Shell,
  TaskChain
} from '@ionic/cli-utils';
import { filterArgumentsForCordova } from '../lib/utils/cordova';
import { resetSrcContent } from '../lib/utils/configXmlUtils';
import {
  copyIconFilesIntoResources,
  addIonicIcons,
  savePlatform,
  removePlatform
} from '../lib/platform';

/**
 * Metadata about the platform command
 */
@CommandMetadata({
  name: 'platform',
  description: 'Add platform target for building an Ionic app',
  inputs: [
    {
      name: 'platform',
      description: 'the platform that you would like to build',
    }
  ],
  options: [
    {
      name: 'noresources',
      description: 'Do not add default Ionic icons and splash screen resources',
      type: Boolean,
      default: false,
      aliases: ['r']
    },
    {
      name: 'nosave',
      description: 'Do not save the platform to the package.json file',
      type: Boolean,
      aliases: ['e']
    }
  ]
})
export class PlatformCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {

    const addResources = inputs.includes('add') && !(options['noresources']);
    const platformName = inputs[0];

    var tasks = new TaskChain();

    // ensure the content node was set back to its original
    await resetSrcContent(this.env.project.directory);

    if (addResources) {
      await copyIconFilesIntoResources(this.env.project.directory);
      await addIonicIcons(this.env.project.directory, platformName);
    }

    const optionList: string[] = filterArgumentsForCordova(this.metadata, inputs, options);

    tasks.next(`Executing cordova command: ${chalk.bold('cordova ' + optionList.join(' '))}`);
    const runCode = await new Shell().run('cordova', optionList);

    // We dont want to do anything if the cordova command failed
    if (runCode !== '0' || options['nosave']) {
      return;
    }

    if (inputs.includes('add')) {
      this.env.log.info('Saving platform to package.json file');
      return savePlatform(this.env.project.directory, platformName);
    }

    if (inputs.includes('rm') || inputs.includes('remove')) {
      this.env.log.info('Removing platform from package.json file');
      return removePlatform(this.env.project.directory, platformName);
    }
  }
}
