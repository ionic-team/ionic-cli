import { OptionGroup } from '@ionic/cli-framework';
import { columnar, prettyPath } from '@ionic/cli-framework/utils/format';
import { strcmp } from '@ionic/cli-framework/utils/string';
import chalk from 'chalk';
import * as lodash from 'lodash';
import * as util from 'util';

import { PROJECT_FILE } from '../../constants';
import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../definitions';
import { input, strong, weak } from '../../lib/color';

import { BaseConfigCommand, ConfigContext, getConfigValue } from './base';

export class ConfigGetCommand extends BaseConfigCommand {
  async getMetadata(): Promise<CommandMetadata> {
    const projectFile = this.project ? prettyPath(this.project.filePath) : PROJECT_FILE;

    return {
      name: 'get',
      type: 'global',
      summary: 'Print config values',
      description: `
This command reads and prints configuration values from the project's ${strong(projectFile)} file. It can also operate on the global CLI configuration (${strong('~/.ionic/config.json')}) using the ${input('--global')} option.

For nested properties, separate nest levels with dots. For example, the property name ${input('integrations.cordova')} will look in the ${strong('integrations')} object for the ${strong('cordova')} property.

Without a ${input('property')} argument, this command prints out the entire config.

For multi-app projects, this command is scoped to the current project by default. To operate at the root of the project configuration file instead, use the ${input('--root')} option.

If you are using this command programmatically, you can use the ${input('--json')} option.

This command will sanitize config output for known sensitive fields (disabled when using ${input('--json')}).
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
          groups: [OptionGroup.Advanced],
        },
        {
          name: 'root',
          summary: `Operate on root of ${strong(projectFile)}`,
          type: Boolean,
          hint: weak('[multi-app]'),
          groups: [OptionGroup.Advanced],
        },
      ],
      exampleCommands: ['', 'id', '--global user.email', '-g npmClient'],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const ctx = this.generateContext(inputs, options);
    const conf = getConfigValue(ctx);

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
          .map(([k, v]) => [strong(k), util.inspect(v, { colors: chalk.enabled })]);

        columns.sort((a, b) => strcmp(a[0], b[0]));

        this.env.log.rawmsg(columnar(columns, {}));
      } else {
        this.env.log.rawmsg(util.inspect(v, { depth: Infinity, colors: chalk.enabled }));
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
