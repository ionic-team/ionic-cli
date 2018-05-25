import chalk from 'chalk';

import { OptionGroup, contains, validate, validators } from '@ionic/cli-framework';
import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandPreRun } from '@ionic/cli-utils';
import { filterArgumentsForCordova } from '@ionic/cli-utils/lib/integrations/cordova/utils';
import { FatalException } from '@ionic/cli-utils/lib/errors';

import { CordovaCommand } from './base';

export class PluginCommand extends CordovaCommand implements CommandPreRun {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'plugin',
      type: 'project',
      summary: 'Manage Cordova plugins',
      description: `
Like running ${chalk.green('cordova plugin')} directly, but provides friendly checks.
      `,
      exampleCommands: ['', 'add cordova-plugin-inappbrowser@latest', 'add phonegap-plugin-push --variable SENDER_ID=XXXXX', 'rm cordova-plugin-camera'],
      inputs: [
        {
          name: 'action',
          summary: `${chalk.green('add')} or ${chalk.green('remove')} a plugin; ${chalk.green('ls')} or ${chalk.green('save')} all project plugins`,
        },
        {
          name: 'plugin',
          summary: `The name of the plugin (corresponds to ${chalk.green('add')} and ${chalk.green('remove')})`,
        },
      ],
      options: [
        {
          name: 'force',
          summary: `Force overwrite the plugin if it exists (corresponds to ${chalk.green('add')})`,
          type: Boolean,
          groups: [OptionGroup.Advanced, 'cordova'],
        },
        {
          name: 'variable',
          summary: 'Specify plugin variables',
          groups: ['cordova'],
        },
      ],
    };
  }

  async preRun(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    await this.preRunChecks(runinfo);

    inputs[0] = (typeof inputs[0] === 'undefined') ? 'ls' : inputs[0];
    inputs[0] = (inputs[0] === 'rm') ? 'remove' : inputs[0];
    inputs[0] = (inputs[0] === 'list') ? 'ls' : inputs[0];

    validate(inputs[0], 'action', [contains(['add', 'remove', 'ls', 'save'], {})]);

    // If the action is list then lets just end here.
    if (['ls', 'save'].includes(inputs[0])) {
      await this.runCordova(['plugin', inputs[0]], {});
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
    const metadata = await this.getMetadata();
    const optionList = filterArgumentsForCordova(metadata, options);

    if (!optionList.includes('--save')) {
      optionList.push('--save');
    }

    await this.runCordova(optionList, {});
  }
}
