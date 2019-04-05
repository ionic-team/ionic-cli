import { OptionGroup, validators } from '@ionic/cli-framework';
import { prettyPath } from '@ionic/cli-framework/utils/format';

import { PROJECT_FILE } from '../../constants';
import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../definitions';
import { input, strong, weak } from '../../lib/color';
import { FatalException } from '../../lib/errors';

import { BaseConfigCommand, getConfigValue, setConfigValue } from './base';

export class ConfigSetCommand extends BaseConfigCommand {
  async getMetadata(): Promise<CommandMetadata> {
    const projectFile = this.project ? prettyPath(this.project.filePath) : PROJECT_FILE;

    return {
      name: 'set',
      type: 'global',
      summary: 'Set config values',
      description: `
This command writes configuration values to the project's ${strong(prettyPath(projectFile))} file. It can also operate on the global CLI configuration (${strong('~/.ionic/config.json')}) using the ${input('--global')} option.

For nested properties, separate nest levels with dots. For example, the property name ${input('integrations.cordova')} will look in the ${strong('integrations')} object for the ${strong('cordova')} property.

For multi-app projects, this command is scoped to the current project by default. To operate at the root of the project configuration file instead, use the ${input('--root')} option.

This command will attempt to coerce ${input('value')} into a suitable JSON type. If it is JSON-parsable, such as ${input('123')}, ${input('true')}, ${input('[]')}, etc., then it takes the parsed result. Otherwise, the value is interpreted as a string. For stricter input, use ${input('--json')}, which will error with non-JSON values.

By default, if ${input('property')} exists and is an object or an array, the value is not overwritten. To disable this check and always overwrite the property, use ${input('--force')}.
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
          summary: `Always interpret ${input('value')} as JSON`,
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
          summary: `Operate on root of ${strong(prettyPath(projectFile))}`,
          type: Boolean,
          hint: weak('[multi-app]'),
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
      throw new FatalException(`Cannot set config to ${input(ctx.value)} without a property.`);
    }

    const originalValue = getConfigValue(ctx);
    setConfigValue({ ...ctx, property, originalValue });

    if (ctx.value !== originalValue) {
      this.env.log.ok(`${input(property)} set to ${input(JSON.stringify(ctx.value))}!`);
    } else {
      this.env.log.info(`${input(property)} is already set to ${input(JSON.stringify(ctx.value))}.`);
    }
  }
}
