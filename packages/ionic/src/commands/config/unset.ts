import chalk from 'chalk';
import * as lodash from 'lodash';

import { validators } from '@ionic/cli-framework';
import { prettyPath } from '@ionic/cli-framework/utils/format';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, IBaseConfig, PROJECT_FILE } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';

export class ConfigUnsetCommand extends Command {
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
    const [ p ] = inputs;
    const { global } = options;

    if (!global && !this.env.project.directory) {
      throw new FatalException(`Sorry--this won't work outside an Ionic project directory. Did you mean to print global config using ${chalk.green('--global')}?`);
    }

    const file: IBaseConfig<object> = global ? this.env.config : this.env.project;

    const config = await file.load();
    const propertyExists = lodash.has(config, p);

    if (propertyExists) {
      lodash.unset(config, p);
      this.env.log.ok(`${chalk.green(p)} unset in ${chalk.bold(prettyPath(file.filePath))}.`);
    } else {
      this.env.log.warn(`Property ${chalk.green(p)} does not exist--cannot unset.`);
    }

    await file.save();
  }
}
