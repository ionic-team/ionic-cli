import { OptionGroup, validators } from '@ionic/cli-framework';
import chalk from 'chalk';

import { PROJECT_FILE } from '../../constants';
import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../definitions';
import { FatalException } from '../../lib/errors';

import { BaseConfigCommand, getConfigValue, unsetConfigValue } from './base';

export class ConfigUnsetCommand extends BaseConfigCommand {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'unset',
      type: 'global',
      summary: 'Delete config values',
      description: `
This command deletes configuration values from the project's ${chalk.bold(PROJECT_FILE)} file. It can also operate on the global CLI configuration (${chalk.bold('~/.ionic/config.json')}) using the ${chalk.green('--global')} option.

For nested properties, separate nest levels with dots. For example, the property name ${chalk.green('integrations.cordova')} will look in the ${chalk.bold('integrations')} object for the ${chalk.bold('cordova')} property.

For multi-app projects, this command is scoped to the current project by default. To operate at the root of the project configuration file instead, use the ${chalk.green('--root')} option.
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
        {
          name: 'root',
          summary: `Operate on root of ${chalk.bold(PROJECT_FILE)}`,
          type: Boolean,
          hint: chalk.dim('[multi-app]'),
          groups: [OptionGroup.Advanced],
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

    const propertyExists = typeof getConfigValue(ctx) !== 'undefined';
    unsetConfigValue({ ...ctx, property });

    if (propertyExists) {
      this.env.log.ok(`${chalk.green(property)} unset!`);
    } else {
      this.env.log.warn(`Property ${chalk.green(property)} does not exist--cannot unset.`);
    }
  }
}
