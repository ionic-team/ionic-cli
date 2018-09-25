import { OptionGroup, validators } from '@ionic/cli-framework';
import chalk from 'chalk';

import { PROJECT_FILE } from '../../constants';
import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../definitions';
import { FatalException } from '../../lib/errors';

import { BaseConfigCommand, getConfigValue, setConfigValue } from './base';

export class ConfigSetCommand extends BaseConfigCommand {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'set',
      type: 'global',
      summary: 'Set config values',
      description: `
This command writes configuration values to the project's ${chalk.bold(PROJECT_FILE)} file. It can also operate on the global CLI configuration (${chalk.bold('~/.ionic/config.json')}) using the ${chalk.green('--global')} option.

For nested properties, separate nest levels with dots. For example, the property name ${chalk.green('integrations.cordova')} will look in the ${chalk.bold('integrations')} object for the ${chalk.bold('cordova')} property.

For multi-app projects, this command is scoped to the current project by default. To operate at the root of the project configuration file instead, use the ${chalk.green('--root')} option.

This command will attempt to coerce ${chalk.green('value')} into a suitable JSON type. If it is JSON-parsable, such as ${chalk.green('123')}, ${chalk.green('true')}, ${chalk.green('[]')}, etc., then it takes the parsed result. Otherwise, the value is interpreted as a string. For stricter input, use ${chalk.green('--json')}, which will error with non-JSON values.

By default, if ${chalk.green('property')} exists and is an object or an array, the value is not overwritten. To disable this check and always overwrite the property, use ${chalk.green('--force')}.
      `,
      inputs: [
        {
          name: 'property',
          summary: 'The property name you wish to set',
          validators: [validators.required],
        },
        {
          name: 'value',
          summary: 'The new value of the given property',
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
          name: 'json',
          summary: `Always interpret ${chalk.green('value')} as JSON`,
          type: Boolean,
          groups: [OptionGroup.Advanced],
        },
        {
          name: 'force',
          summary: 'Always overwrite existing values',
          type: Boolean,
          groups: [OptionGroup.Advanced],
        },
        {
          name: 'root',
          summary: `Operate on root of ${chalk.bold(PROJECT_FILE)}`,
          type: Boolean,
          hint: chalk.dim('[multi-app]'),
          groups: [OptionGroup.Advanced],
        },
      ],
      exampleCommands: ['name newAppName', 'name "\\"newAppName\\"" --json', '-g interactive false'],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const ctx = this.generateContext(inputs, options);
    const { property } = ctx;

    if (typeof property === 'undefined') {
      throw new FatalException(`Cannot set config to ${chalk.green(ctx.value)} without a property.`);
    }

    const originalValue = getConfigValue(ctx);
    setConfigValue({ ...ctx, property, originalValue });

    if (ctx.value !== originalValue) {
      this.env.log.ok(`${chalk.green(property)} set to ${chalk.green(JSON.stringify(ctx.value))}!`);
    } else {
      this.env.log.info(`${chalk.green(property)} is already set to ${chalk.green(JSON.stringify(ctx.value))}.`);
    }
  }
}
