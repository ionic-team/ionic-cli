import * as chalk from 'chalk';

import {
  CommandLineInputs,
  CommandLineOptions,
  CommandPreInputsPrompt,
  CommandMetadata,
  normalizeOptionAliases,
  validators,
} from '@ionic/cli-utils';

import { load } from '../lib/modules';
import { gatherArgumentsForCordova } from '../lib/utils/cordova';
import { resetConfigXmlContentSrc } from '../lib/utils/configXmlUtils';
import { CordovaCommand } from './base';

@CommandMetadata({
  name: 'plugin',
  type: 'project',
  description: 'Manage Cordova plugins',
  exampleCommands: ['add cordova-plugin-inappbrowser@latest', 'list'],
  inputs: [
    {
      name: 'action',
      description: `${chalk.green('add')} or ${chalk.green('remove')} a plugin; ${chalk.green('list')} all project plugins`,
    },
    {
      name: 'plugin',
      description: `The name of the plugin (corresponds to ${chalk.green('add')} and ${chalk.green('remove')})`,
    }
  ],
  options: [
    {
      name: 'force',
      description: `Forve overwrite the plugin if it exists (corresponds to ${chalk.green('add')})`,
      type: Boolean,
      default: false
    }
  ]
})
export class PluginCommand extends CordovaCommand implements CommandPreInputsPrompt {
  async preInputsPrompt(inputs: CommandLineInputs): Promise<void | number> {
    inputs[0] = (typeof inputs[0] === 'undefined') ? 'list' : inputs[0];
    inputs[0] = (inputs[0] === 'rm') ? 'remove' : inputs[0];
    inputs[0] = (inputs[0] === 'ls') ? 'list' : inputs[0];

    // If the action is list then lets just end here.
    if (inputs[0] === 'list') {
      const response = await this.runCordova(['plugin', 'list']);
      this.env.log.msg(response);
      return 0;
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [ action, pluginName ] = inputs;

    if (!pluginName) {
      const inquirer = load('inquirer');
      const promptResults = await inquirer.prompt({
        message: `What plugin would you like to ${action}:`,
        type: 'input',
        name: 'plugin',
      });

      inputs[1] = pluginName = promptResults['pluginName'];
    }

    // ensure the content node was set back to its original
    await resetConfigXmlContentSrc(this.env.project.directory);

    const normalizedOptions = normalizeOptionAliases(this.metadata, options);
    await this.runCordova(gatherArgumentsForCordova(this.metadata, inputs, normalizedOptions));
  }
}
