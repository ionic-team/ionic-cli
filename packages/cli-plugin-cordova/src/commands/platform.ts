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
import { KnownPlatform } from '../definitions';
import { filterArgumentsForCordova } from '../lib/utils/cordova';
import { resetConfigXmlContentSrc } from '../lib/utils/configXmlUtils';
import {
  addDefaultImagesToResources
} from '../lib/resources';

/**
 * Metadata about the platform command
 */
@CommandMetadata({
  name: 'platform',
  description: 'Add or remove a platform target for building an Ionic app',
  exampleCommands: ['add android'],
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
    await resetConfigXmlContentSrc(this.env.project.directory);

    const optionList: string[] = filterArgumentsForCordova(this.metadata, inputs, options);

    tasks.next(`Executing cordova command: ${chalk.bold('cordova ' + optionList.join(' '))}`);
    await new Shell().run('cordova', optionList, {
      showExecution: (this.env.log.level === 'debug')
    });

    if (action === 'add' && !(options['noresources']) && ['ios', 'android', 'wp8'].includes(platformName)) {
      tasks.next(`Copying default image resources into ${chalk.bold('/resources/' + platformName)}`);
      try {
        await addDefaultImagesToResources(this.env.project.directory, <KnownPlatform>platformName);
      } catch (e) {
        throw e;
      }
    }

    tasks.end();
  }
}
