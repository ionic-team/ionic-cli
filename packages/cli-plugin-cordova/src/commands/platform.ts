import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  // Shell
} from '@ionic/cli-utils';
// import { filterArgumentsForCordova } from '../lib/utils/cordova';
// import { resetSrcContent } from '../lib/utils/configXmlUtils';

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
    /*
    const isAddCmd = inputs.includes('add');
    const isRmCmd = inputs.includes('rm') || inputs.includes('remove');
    const addResources = isAddCmd && !(options['noresources']);

    // ensure the content node was set back to its original
    await resetSrcContent(this.env.project.directory);

    if (addResources) {
      await IonicResources.copyIconFilesIntoResources(appDirectory)
      await IonicResources.addIonicIcons(appDirectory, argumentName);
    }
    const optionList: string[] = filterArgumentsForCordova('platform', inputs, options);
    const runCode = await new Shell().run('cordova', optionList);

    // We dont want to do anything if the cordova command failed
    if (runCode !== '0' || options['nosave']) {
      return;
    }

    if (isAddCmd) {
      this.env.log.info('Saving platform to package.json file');
      return State.savePlatform(appDirectory, argumentName);
    }

    if (isRmCmd) {
      this.env.log.info('Removing platform from package.json file');
      return State.removePlatform(appDirectory, argumentName);
    }
    */
  }
}
