import * as util from 'util';
import * as chalk from 'chalk';

import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  IConfig,
  PROJECT_FILE,
  prettyPath,
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'set',
  type: 'global',
  description: 'Set config values',
  longDescription: `
By default, this command sets properties in your project's ${chalk.bold(PROJECT_FILE)} file.

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
  resolveValue(v: string): string | boolean {
    if (v === 'true') {
      return true;
    }

    if (v === 'false') {
      return false;
    }

    return v;
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [ p, v ] = inputs;
    const { global } = options;

    if (!global && !this.env.project.directory) {
      throw this.exit(`Sorry--this won't work outside an Ionic project directory. Did you mean to set global config using ${chalk.green('--global')}?`);
    }

    const file: IConfig<Object> = global ? this.env.config : this.env.project;

    const config = await file.load();
    const lodash = this.env.load('lodash');

    const oldValue = lodash.get(config, p);
    const newValue = this.resolveValue(v);

    if (oldValue && typeof oldValue === 'object') {
      const prettyOldValue = util.inspect(oldValue, { breakLength: Infinity, colors: chalk.enabled });

      throw this.exit(
        `Sorry--will not override objects or arrays.\n` +
        `Value of ${chalk.green(p)} is: ${prettyOldValue}`
      );
    }

    const valueChanged = oldValue !== newValue;

    await this.env.hooks.fire('command:config:set', { env: this.env, cmd: this, inputs, options, valueChanged });

    if (valueChanged) {
      lodash.set(config, p, newValue);
      await file.save();
      this.env.log.ok(`${chalk.green(p)} set to ${chalk.green(v)} in ${chalk.bold(prettyPath(file.filePath))}!`);
    } else {
      this.env.log.info(`${chalk.green(p)} is already set to ${chalk.green(v)}.`);
    }
  }
}
