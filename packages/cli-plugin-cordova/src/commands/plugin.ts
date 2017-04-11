import * as chalk from 'chalk';
import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  TaskChain,
  normalizeOptionAliases,
  validators,
} from '@ionic/cli-utils';

import { load } from '../lib/modules';
import { gatherArgumentsForCordova } from '../lib/utils/cordova';
import { resetConfigXmlContentSrc } from '../lib/utils/configXmlUtils';

/**
 * Metadata about the compile command
 */
@CommandMetadata({
  name: 'plugin',
  description: 'Manage Cordova plugins',
  exampleCommands: ['add cordova-plugin-inappbrowser@latest', 'list'],
  inputs: [
    {
      name: 'action',
      description: `${chalk.green('add')} or ${chalk.green('remove')} a plugin; ${chalk.green('list')} all project plugins`,
      validators: [validators.required],
      prompt: {
        type: 'list',
        choices: ['add', 'remove', 'list']
      }
    },
    {
      name: 'plugin',
      description: `The name of the plugin (corresponds to ${chalk.green('add')} and ${chalk.green('remove')})`,
    }
  ],
  options: [
    {
      name: 'nosave',
      description: `Do not update config.xml (corresponds to ${chalk.green('add')} and ${chalk.green('remove')})`,
      type: Boolean,
      default: false,
      aliases: ['e']
    },
    {
      name: 'force',
      description: `Forve overwrite the plugin if it exists (corresponds to ${chalk.green('add')})`,
      type: Boolean,
      default: false
    }
  ]
})
export class PluginCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {

    let action = inputs[0];
    action = (action === 'rm') ? 'remove' : action;
    action = (action === 'ls') ? 'list' : action;

    // If the action is list then lets just end here.
    if (action === 'list') {
      try {
        var response = await this.env.shell.run('cordova', [this.metadata.name, action], {
          showExecution: (this.env.log.level === 'debug')
        });
        return this.env.log.msg(response);
      } catch (e) {
        throw e;
      }
    }


    let pluginName = inputs[1];
    if (!pluginName) {
      const inquirer = load('inquirer');
      const promptResults = await inquirer.prompt({
        message: `What plugin would you like to ${action}:`,
        type: 'input',
        name: 'plugin',
      });
      inputs[1] = pluginName = promptResults['pluginName'];
    }
    const tasks = new TaskChain();

    // ensure the content node was set back to its original
    await resetConfigXmlContentSrc(this.env.project.directory);
    const normalizedOptions = normalizeOptionAliases(this.metadata, options);
    console.log(normalizedOptions);
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

    tasks.end();
  }
}
