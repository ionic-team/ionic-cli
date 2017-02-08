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
import { resetConfigXmlContentSrc } from '../lib/utils/configXmlUtils';

/**
 * Metadata about the compile command
 */
@CommandMetadata({
  name: 'plugin',
  description: 'Manage cordova plugins',
  exampleCommands: ['add cordova-plugin-inappbrowser@latest --save', 'save', 'list'],
  inputs: [
    {
      name: 'action',
      description: `${chalk.bold('add')}, ${chalk.bold('remove')}, i${chalk.bold('list')}, ${chalk.bold('save')} the plugin`,
      validators: [validators.required],
      prompt: {
        type: 'list',
        choices: ['add', 'remove', 'list', 'save']
      }
    }
  ],
  options: [
    {
      name: 'save',
      description: 'Add or remove the plugin from config.xml as well (add, remove)',
      type: Boolean,
      default: false,
    },
    {
      name: 'force',
      description: 'Update the plugin even if the same file already exists (add)',
      type: Boolean,
      default: false
    }
  ]
})
export class PluginCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {

    const tasks = new TaskChain();

    // ensure the content node was set back to its original
    await resetConfigXmlContentSrc(this.env.project.directory);

    const optionList: string[] = filterArgumentsForCordova(this.metadata, inputs, options);

    tasks.next(`Executing cordova command: ${chalk.bold('cordova ' + optionList.join(' '))}`);
    await new Shell().run('cordova', optionList, {
      showExecution: (this.env.log.level === 'debug')
    });

    tasks.end();
  }
}
