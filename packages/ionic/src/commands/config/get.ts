import * as util from 'util';
import * as chalk from 'chalk';

import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  PROJECT_FILE,
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'get',
  type: 'global',
  description: 'Print config values',
  longDescription: `
By default, this command prints properties in your project's ${chalk.bold(PROJECT_FILE)} file.

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
  scrubTokens(obj: any) {
    const lodash = this.env.load('lodash');
    return lodash.mapValues(obj, () => '*****');
  }

  sanitize(key: string, obj: any) {
    const lodash = this.env.load('lodash');

    if (typeof obj === 'object' && 'tokens' in obj) {
      obj['tokens'] = this.scrubTokens(obj['tokens']);
    }

    if (key === 'tokens') {
      lodash.assign(obj, this.scrubTokens(obj));
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [ p ] = inputs;
    const { global, json } = options;

    if (!global && !this.env.project.directory) {
      throw this.exit(`Sorry--this won't work outside an Ionic project directory. Did you mean to print global config using ${chalk.green('--global')}?`);
    }

    const file = global ? this.env.config : this.env.project;

    const config = await file.load();
    const lodash = this.env.load('lodash');

    const v = lodash.cloneDeep(p ? lodash.get(config, p) : config);

    if (json) {
      process.stdout.write(JSON.stringify(v));
    } else {
      this.sanitize(p, v);
      this.env.log.msg(util.inspect(v, { colors: chalk.enabled }));
    }
  }
}
