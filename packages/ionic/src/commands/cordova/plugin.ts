import * as chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandPreRun } from '@ionic/cli-utils';
import { CommandMetadata } from '@ionic/cli-utils/lib/command';

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
      description: `Forve overwrite the plugin if it exists (corresponds to ${chalk.green('add')})`,
      type: Boolean,
      intent: 'CORDOVA',
    },
    {
      name: 'variable',
      description: 'Specify plugin variables',
      intent: 'CORDOVA',
    }
  ]
})
export class PluginCommand extends CordovaCommand implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
    const { contains, validate, validators } = await import('@ionic/cli-utils/lib/validators');

    await this.preRunChecks();

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
    const { ConfigXml } = await import('@ionic/cli-utils/lib/cordova/config');
    const { filterArgumentsForCordova } = await import('@ionic/cli-utils/lib/cordova/utils');

    const conf = await ConfigXml.load(this.env.project.directory);
    await conf.resetContentSrc();
    await conf.save();

    const optionList = filterArgumentsForCordova(this.metadata, inputs.splice(0, 2), options);

    if (!optionList.includes('--save')) {
      optionList.push('--save');
    }

    // TODO: showExecution and filter out double newlines from cordova
    const response = await this.runCordova(optionList);
    this.env.log.msg(response);
  }
}
