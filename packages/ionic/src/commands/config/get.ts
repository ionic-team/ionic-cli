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
  ],
  exampleCommands: ['', 'app_id', '--global user.email', '-g yarn'],
})
export class ConfigGetCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let [ p ] = inputs;
    const { global } = options;

    if (!global && !this.env.project.directory) {
      throw this.exit(`Sorry--this won't work outside an Ionic project directory. Did you mean to print global config using ${chalk.green('--global')}?`);
    }

    const file = global ? this.env.config : this.env.project;

    const config = await file.load();
    const lodash = this.env.load('lodash');

    let v = lodash.cloneDeep<{ [key: string]: any }>(p ? lodash.get(config, p) : config);
    const scrubbedTokens = { user: '*****', telemetry: '*****' };

    if (typeof v === 'object' && 'tokens' in v) {
      v['tokens'] = scrubbedTokens;
    }

    if (p === 'tokens') {
      v = scrubbedTokens;
    }

    this.env.log.msg(util.inspect(v, { colors: chalk.enabled }));
  }
}
