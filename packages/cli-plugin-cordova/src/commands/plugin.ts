import * as chalk from 'chalk';

import {
  CommandLineInputs,
  CommandLineOptions,
  CommandPreRun,
  CommandMetadata,
  contains,
  validate,
} from '@ionic/cli-utils';

import { filterArgumentsForCordova } from '../lib/utils/cordova';
import { resetConfigXmlContentSrc } from '../lib/utils/configXmlUtils';
import { CordovaCommand } from './base';

@CommandMetadata({
  name: 'plugin',
  type: 'project',
  description: 'Manage Cordova plugins',
  exampleCommands: ['add cordova-plugin-inappbrowser@latest', 'ls'],
  inputs: [
    {
      name: 'action',
      description: `${chalk.green('add')} or ${chalk.green('remove')} a plugin; ${chalk.green('ls')} or ${chalk.green('save')} all project plugins`,
    },
    {
      name: 'plugin',
      description: `The name of the plugin (corresponds to ${chalk.green('add')} and ${chalk.green('remove')})`,
    },
  ],
  options: [
    {
      name: 'force',
      description: `Forve overwrite the plugin if it exists (corresponds to ${chalk.green('add')})`,
      type: Boolean,
      default: false,
    },
  ]
})
export class PluginCommand extends CordovaCommand implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
    await this.checkForAssetsFolder();

    inputs[0] = (typeof inputs[0] === 'undefined') ? 'ls' : inputs[0];
    inputs[0] = (inputs[0] === 'rm') ? 'remove' : inputs[0];
    inputs[0] = (inputs[0] === 'list') ? 'ls' : inputs[0];

    validate(inputs[0], 'action', [contains(['add', 'remove', 'ls', 'save'], {})]);

    // If the action is list then lets just end here.
    if (['ls', 'save'].includes(inputs[0])) {
      const response = await this.runCordova(['plugin', inputs[0]]);
      this.env.log.msg(response);
      return 0;
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [ action, pluginName ] = inputs;

    if (!pluginName) {
      const promptResults = await this.env.prompt({
        message: `What plugin would you like to ${action}:`,
        type: 'input',
        name: 'plugin',
      });

      inputs[1] = pluginName = promptResults['plugin'];
    }

    // ensure the content node was set back to its original
    await resetConfigXmlContentSrc(this.env.project.directory);

    const optionList = filterArgumentsForCordova(this.metadata, inputs, options);

    if (!optionList.includes('--save')) {
      optionList.push('--save');
    }

    // TODO: showExecution and filter out double newlines from cordova
    const response = await this.runCordova(optionList);
    this.env.log.msg(response);
  }
}
