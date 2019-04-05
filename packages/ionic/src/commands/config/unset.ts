import { OptionGroup, validators } from '@ionic/cli-framework';
import { prettyPath } from '@ionic/cli-framework/utils/format';

import { PROJECT_FILE } from '../../constants';
import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../definitions';
import { input, strong, weak } from '../../lib/color';
import { FatalException } from '../../lib/errors';

import { BaseConfigCommand, getConfigValue, unsetConfigValue } from './base';

export class ConfigUnsetCommand extends BaseConfigCommand {
  async getMetadata(): Promise<CommandMetadata> {
    const projectFile = this.project ? prettyPath(this.project.filePath) : PROJECT_FILE;

    return {
      name: 'unset',
      type: 'global',
      summary: 'Delete config values',
      description: `
This command deletes configuration values from the project's ${strong(prettyPath(projectFile))} file. It can also operate on the global CLI configuration (${strong('~/.ionic/config.json')}) using the ${input('--global')} option.

For nested properties, separate nest levels with dots. For example, the property name ${input('integrations.cordova')} will look in the ${strong('integrations')} object for the ${strong('cordova')} property.

For multi-app projects, this command is scoped to the current project by default. To operate at the root of the project configuration file instead, use the ${input('--root')} option.
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
          summary: `Operate on root of ${strong(prettyPath(projectFile))}`,
          type: Boolean,
          hint: weak('[multi-app]'),
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
      this.env.log.ok(`${input(property)} unset!`);
    } else {
      this.env.log.warn(`Property ${input(property)} does not exist--cannot unset.`);
    }
  }
}
