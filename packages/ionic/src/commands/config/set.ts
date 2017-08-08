import * as chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions } from '@ionic/cli-utils';
import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';

@CommandMetadata({
  name: 'set',
  type: 'global',
  description: 'Set config values',
  longDescription: `
By default, this command sets properties in your project's ${chalk.bold('ionic.config.json')} file.

For ${chalk.green('--global')} config, the CLI sets properties in the global CLI config file (${chalk.bold('~/.ionic/config.json')}).

For nested properties, separate nest levels with dots. For example, the property name ${chalk.green('user.email')} will look in the ${chalk.bold('user')} object (a root-level field in the global CLI config file) for the ${chalk.bold('email')} field.
  `,
  inputs: [
    {
      name: 'property',
      description: 'The property name you wish to set',
      required: true,
    },
    {
      name: 'value',
      description: 'The new value of the given property, interpreted as a string unless "true" or "false"',
      required: true,
    },
  ],
  options: [
    {
      name: 'global',
      description: 'Use global CLI config',
      type: Boolean,
      aliases: ['g'],
    },
  ],
  exampleCommands: ['name newAppName', '-g yarn true'],
})
export class ConfigSetCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { set } = await import('@ionic/cli-utils/commands/config/set');
    await set(this.env, inputs, options);
  }
}
