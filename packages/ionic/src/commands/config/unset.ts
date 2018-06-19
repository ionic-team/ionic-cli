import { validators } from '@ionic/cli-framework';
import { CommandLineInputs, CommandLineOptions, CommandMetadata, PROJECT_FILE } from '@ionic/cli-utils';
import { FatalException } from '@ionic/cli-utils/lib/errors';
import chalk from 'chalk';

import { BaseConfigCommand, getConfig, unsetConfig } from './base';

export class ConfigUnsetCommand extends BaseConfigCommand {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'unset',
      type: 'global',
      summary: 'Delete config values',
      description: `
By default, this command deletes properties in your project's ${chalk.bold(PROJECT_FILE)} file.

For ${chalk.green('--global')} config, the CLI deletes properties in the global CLI config file (${chalk.bold('~/.ionic/config.json')}).

For nested properties, separate nest levels with dots. For example, the property name ${chalk.green('user.email')} will look in the ${chalk.bold('user')} object (a root-level field in the global CLI config file) for the ${chalk.bold('email')} field.
      `,
      inputs: [
        {
          name: 'property',
          summary: 'The property name you wish to delete',
          validators: [validators.required],
        },
      ],
      options: [
        {
          name: 'global',
          summary: 'Use global CLI config',
          type: Boolean,
          aliases: ['g'],
        },
      ],
      exampleCommands: ['', 'type', '--global git.setup', '-g interactive'],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const ctx = this.generateContext(inputs, options);
    const { property } = ctx;

    if (typeof property === 'undefined') {
      throw new FatalException(`Cannot unset config entry without a property.`);
    }

    const propertyExists = typeof getConfig(ctx) !== 'undefined';
    unsetConfig({ ...ctx, property });

    if (propertyExists) {
      this.env.log.ok(`${chalk.green(property)} unset!`);
    } else {
      this.env.log.warn(`Property ${chalk.green(property)} does not exist--cannot unset.`);
    }
  }
}
