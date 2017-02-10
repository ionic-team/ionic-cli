import * as os from 'os';
import * as chalk from 'chalk';
import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  Shell,
  TaskChain,
  validators,
  normalizeOptionAliases
} from '@ionic/cli-utils';
import { KnownPlatform } from '../definitions';
import { filterArgumentsForCordova } from '../lib/utils/cordova';
import { resetConfigXmlContentSrc } from '../lib/utils/configXmlUtils';
import {
  addDefaultImagesToProjectResources
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
      description: `${chalk.bold('add')}, ${chalk.bold('remove')}, or ${chalk.bold('update')} a platform; ${chalk.bold('list')} all project platforms`,
      validators: [validators.required],
      prompt: {
        type: 'list',
        choices: ['add', 'remove', 'update', 'list']
      }
    },
    {
      name: 'platform',
      description: `the platform that you would like to add: ${chalk.bold('ios')}, ${chalk.bold('android')}`,
    }
  ],
  options: [
    {
      name: 'noresources',
      description: 'Do not add default Ionic icons and splash screen resources (add)',
      type: Boolean,
      default: false,
      aliases: ['r']
    },
    {
      name: 'nosave',
      description: 'Do not update the config.xml (add, remove, update)',
      type: Boolean,
      default: false,
      aliases: ['e']
    }
  ]
})
export class PlatformCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {

    let action = inputs[0];
    action = (action === 'rm') ? 'remove' : action;
    action = (action === 'ls') ? 'list' : action;

    // If the action is list then lets just end here.
    if (action === 'list') {
      try {
        var response = await new Shell().run('cordova', [this.metadata.name, action], {
          showExecution: (this.env.log.level === 'debug')
        });
        return this.env.log.msg(response);
      } catch (e) {
        throw e;
      }
    }

    let platformName = inputs[1];
    if (!platformName) {
      const promptResults = await this.env.inquirer.prompt({
        message: 'What platform would you like to add (ios, android):',
        type: 'input',
        name: 'plugin',
      });
      inputs[1] = platformName = promptResults['platformName'];
    }
    if (platformName === 'ios' && os.platform() !== 'darwin') {
      this.env.log.error('You cannot add the iOS platform unless you are on Mac OSX.');
      return;
    }

    const tasks = new TaskChain();

    // ensure the content node was set back to its original src
    await resetConfigXmlContentSrc(this.env.project.directory);
    const normalizedOptions = normalizeOptionAliases(this.metadata, options);
    const optionList: string[] = filterArgumentsForCordova(this.metadata, inputs, normalizedOptions);

    if (!optionList.includes('--nosave')) {
      optionList.push('--save');
    }

    tasks.next(`Executing cordova command: ${chalk.bold('cordova ' + optionList.join(' '))}`);
    try {
      await new Shell().run('cordova', optionList, {
        showExecution: (this.env.log.level === 'debug')
      });
    } catch (e) {
      throw e;
    }

    if (action === 'add' && !(options['noresources']) && ['ios', 'android', 'wp8'].includes(platformName)) {
      tasks.next(`Copying default image resources into ${chalk.bold('/resources/' + platformName)}`);
      try {
        await addDefaultImagesToProjectResources(this.env.project.directory, <KnownPlatform>platformName);
      } catch (e) {
        throw e;
      }
    }

    tasks.end();
  }
}
