import * as chalk from 'chalk';
import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  Shell,
  TaskChain,
  validators
} from '@ionic/cli-utils';
import { filterArgumentsForCordova } from '../lib/utils/cordova';
import { resetSrcContent } from '../lib/utils/configXmlUtils';
import {
  copyIconFilesIntoResources,
  addIonicIcons
} from '../lib/platform';

/**
 * Metadata about the platform command
 */
@CommandMetadata({
  name: 'platform',
  description: 'Add or remove a platform target for building an Ionic app',
  inputs: [
    {
      name: 'action',
      description: 'Add or remove the platform',
      validators: [validators.required],
      prompt: {
        type: 'list',
        choices: ['add', 'remove']
      }
    },
    {
      name: 'platform',
      description: 'the platform that you would like to build (ex: ios, android)',
      validators: [validators.required],
      prompt: {
        message: 'What platform would you like to build? (ex: ios, android)'
      }
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

    let action = inputs[0];
    action = (action === 'rm') ? 'remove' : action;

    const platformName = inputs[1];
    var tasks = new TaskChain();

    // ensure the content node was set back to its original
    await resetSrcContent(this.env.project.directory);

    if (action === 'add' && !(options['noresources'])) {
      tasks.next(`Copying default image resources into ${chalk.bold('/resources/' + platformName)}`);
      await copyIconFilesIntoResources(this.env.project.directory);
      await addIonicIcons(this.env.project.directory, platformName);
    }

    const optionList: string[] = filterArgumentsForCordova(this.metadata, inputs, options);

    tasks.next(`Executing cordova command: ${chalk.bold('cordova ' + optionList.join(' '))}`);
    await new Shell().run('cordova', optionList, {
      showExecution: (this.env.log.level === 'debug')
    });

    tasks.end();
  }
}
