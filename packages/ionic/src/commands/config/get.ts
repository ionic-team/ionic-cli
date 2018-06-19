import { columnar } from '@ionic/cli-framework/utils/format';
import { strcmp } from '@ionic/cli-framework/utils/string';
import { CommandLineInputs, CommandLineOptions, CommandMetadata, PROJECT_FILE } from '@ionic/cli-utils';
import chalk from 'chalk';
import * as lodash from 'lodash';
import * as util from 'util';

import { BaseConfigCommand, ConfigContext, getConfig } from './base';

export class ConfigGetCommand extends BaseConfigCommand {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'get',
      type: 'global',
      summary: 'Print config values',
      description: `
By default, this command prints properties in your project's ${chalk.bold(PROJECT_FILE)} file.

For ${chalk.green('--global')} config, the CLI prints the global CLI config within ${chalk.bold('~/.ionic/config.json')}.

For nested properties, separate nest levels with dots. For example, the property name ${chalk.green('user.email')} will look in the ${chalk.bold('user')} object (a root-level field in the global CLI config file) for the ${chalk.bold('email')} field.

Without a ${chalk.green('property')} argument, this command prints out the entire file contents.

If you are using this command programmatically, you can use the ${chalk.green('--json')} option.

This command will sanitize config output for known sensitive fields, such as fields within the ${chalk.bold('tokens')} object in the global CLI config file. This functionality is disabled when using ${chalk.green('--json')}.
      `,
      inputs: [
        {
          name: 'property',
          summary: 'The property name you wish to get',
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
          summary: 'Output config values in JSON',
          type: Boolean,
        },
      ],
      exampleCommands: ['', 'pro_id', '--global user.email', '-g npmClient'],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const ctx = this.generateContext(inputs, options);
    const conf = getConfig(ctx);

    this.printConfig(ctx, conf);
  }

  printConfig(ctx: ConfigContext, v: any): void {
    const { global, json } = ctx;

    if (json) {
      process.stdout.write(this.jsonStringify(v));
    } else {
      if (global && v && typeof v === 'object') {
        const columns = lodash.entries(v)
          .map(([k, v]) => [k, this.sanitizeEntry(k, v)])
          .map(([k, v]) => [chalk.bold(k), util.inspect(v, { colors: chalk.enabled })]);

        columns.sort((a, b) => strcmp(a[0], b[0]));

        this.env.log.rawmsg(columnar(columns, {}));
      } else {
        this.env.log.rawmsg(util.inspect(v, { colors: chalk.enabled }));
      }
    }
  }

  sanitizeEntry(key: string, value: any): typeof value {
    if (key.includes('tokens')) {
      return '*****';
    }

    return value;
  }
}
