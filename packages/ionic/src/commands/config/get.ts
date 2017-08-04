import * as chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions } from '@ionic/cli-utils';
import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';

@CommandMetadata({
  name: 'get',
  type: 'global',
  description: 'Print config values',
  longDescription: `
By default, this command prints properties in your project's ${chalk.bold('ionic.config.json')} file.

For ${chalk.green('--global')} config, the CLI prints properties in the global CLI config file (${chalk.bold('~/.ionic/config.json')}).

For nested properties, separate nest levels with dots. For example, the property name ${chalk.green('user.email')} will look in the ${chalk.bold('user')} object (a root-level field in the global CLI config file) for the ${chalk.bold('email')} field.

Without a ${chalk.green('property')} argument, this command prints out the entire file contents.

If you are using this command programmatically, you can use the ${chalk.green('--json')} option.

This command attempts to sanitize config output for known sensitive fields, such as fields within the ${chalk.bold('tokens')} object in the global CLI config file. This functionality is disabled when using ${chalk.green('--json')}.
  `,
  inputs: [
    {
      name: 'property',
      description: 'The property name you wish to get',
      required: false,
    },
  ],
  options: [
    {
      name: 'global',
      description: 'Use global CLI config',
      type: Boolean,
      aliases: ['g'],
    },
    {
      name: 'json',
      description: 'Output config values in JSON',
      type: Boolean,
    },
  ],
  exampleCommands: ['', 'app_id', '--global user.email', '-g yarn'],
})
export class ConfigGetCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { get } = await import('@ionic/cli-utils/commands/config/get');
    await get(this.env, inputs, options);
  }
}
