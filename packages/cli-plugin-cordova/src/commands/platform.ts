import * as os from 'os';
import * as chalk from 'chalk';
import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  CommandPreInputsPrompt,
  TaskChain,
  validators,
  normalizeOptionAliases
} from '@ionic/cli-utils';
import { KnownPlatform } from '../definitions';
import { gatherArgumentsForCordova } from '../lib/utils/cordova';
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
      description: `${chalk.green('add')}, ${chalk.green('remove')}, or ${chalk.green('update')} a platform; ${chalk.green('list')} all project platforms`,
      validators: [validators.required],
      prompt: {
        message: 'What action would you like to take (add, remove, or update):',
      },
    },
    {
      name: 'platform',
      description: `The platform that you would like to add (e.g. ${chalk.bold('ios')}, ${chalk.bold('android')})`,
      validators: [validators.required],
      prompt: {
        message: 'What platform would you like to add (ios, android):',
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
    {
      name: 'nosave',
      description: `Do not update the config.xml (corresponds to ${chalk.green('add')}, ${chalk.green('remove')}, ${chalk.green('update')})`,
      type: Boolean,
      default: false,
      aliases: ['e']
    }
  ]
})
export class PlatformCommand extends Command implements CommandPreInputsPrompt {
  async preInputsPrompt(inputs: CommandLineInputs): Promise<void | number> {
    inputs[0] = (typeof inputs[0] === 'undefined') ? 'list' : inputs[0];
    inputs[0] = (inputs[0] === 'rm') ? 'remove' : inputs[0];
    inputs[0] = (inputs[0] === 'ls') ? 'list' : inputs[0];

    // If the action is list then lets just end here.
    if (inputs[0] === 'list') {
      const response = await this.env.shell.run('cordova', [this.metadata.name, inputs[0]], {
        showExecution: (this.env.log.level === 'debug')
      });

      this.env.log.msg(response);
      return 0;
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [action, platformName] = inputs;
    if (platformName === 'ios' && os.platform() !== 'darwin') {
      this.env.log.error('You cannot add the iOS platform unless you are on Mac OSX.');
      return;
    }

    const tasks = new TaskChain();

    // ensure the content node was set back to its original src
    await resetConfigXmlContentSrc(this.env.project.directory);
    const normalizedOptions = normalizeOptionAliases(this.metadata, options);
    const optionList: string[] = gatherArgumentsForCordova(this.metadata, inputs, normalizedOptions);

    if (!optionList.includes('--nosave')) {
      optionList.push('--save');
    }

    tasks.next(`Executing cordova command: ${chalk.bold('cordova ' + optionList.join(' '))}`);
    try {
      await this.env.shell.run('cordova', optionList, {
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
