import chalk from 'chalk';

import { contains, validate, validators } from '@ionic/cli-framework/lib';
import { CommandLineInputs, CommandLineOptions, CommandPreRun } from '@ionic/cli-utils';
import { CommandMetadata } from '@ionic/cli-utils/lib/command';
import { CORDOVA_INTENT, filterArgumentsForCordova } from '@ionic/cli-utils/lib/cordova/utils';
import { FatalException } from '@ionic/cli-utils/lib/errors';

import { CordovaCommand } from './base';

@CommandMetadata({
  name: 'plugin',
  type: 'project',
  description: 'Manage Cordova plugins',
  longDescription: `
Like running ${chalk.green('cordova plugin')} directly, but provides friendly checks.
  `,
  exampleCommands: ['', 'add cordova-plugin-inappbrowser@latest', 'add phonegap-plugin-push --variable SENDER_ID=XXXXX', 'rm cordova-plugin-camera'],
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
      description: `Force overwrite the plugin if it exists (corresponds to ${chalk.green('add')})`,
      type: Boolean,
      intents: [CORDOVA_INTENT],
      advanced: true,
    },
    {
      name: 'variable',
      description: 'Specify plugin variables',
      intents: [CORDOVA_INTENT],
    }
  ]
})
export class PluginCommand extends CordovaCommand implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    await this.preRunChecks();

    inputs[0] = (typeof inputs[0] === 'undefined') ? 'ls' : inputs[0];
    inputs[0] = (inputs[0] === 'rm') ? 'remove' : inputs[0];
    inputs[0] = (inputs[0] === 'list') ? 'ls' : inputs[0];

    validate(inputs[0], 'action', [contains(['add', 'remove', 'ls', 'save'], {})]);

    // If the action is list then lets just end here.
    if (['ls', 'save'].includes(inputs[0])) {
      await this.runCordova(['plugin', inputs[0]], { showExecution: true });
      throw new FatalException('', 0);
    }

    if (!inputs[1]) {
      const plugin = await this.env.prompt({
        message: `What plugin would you like to ${inputs[0]}:`,
        type: 'input',
        name: 'plugin',
      });

      inputs[1] = plugin;
    }

    validate(inputs[1], 'plugin', [validators.required]);
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const optionList = filterArgumentsForCordova(this.metadata, inputs.splice(0, 2), options);

    if (!optionList.includes('--save')) {
      optionList.push('--save');
    }

    await this.runCordova(optionList, { showExecution: true });
  }
}
