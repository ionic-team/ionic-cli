import chalk from 'chalk';

import { CommandGroup } from '@ionic/cli-framework';
import { columnar, indent } from '@ionic/cli-framework/utils/format';
import { CommandMetadata } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';

export class StateCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'state',
      type: 'global',
      summary: '',
      groups: [CommandGroup.Hidden],
    };
  }

  async run(): Promise<void> {
    const data = [
      [`${indent(4)}${chalk.green('ionic cordova platform save')}`, `save existing installed platforms to ${chalk.bold('config.xml')}`],
      [`${indent(4)}${chalk.green('ionic cordova plugin save')}`, `save existing installed plugins to ${chalk.bold('config.xml')}`],
      [`${indent(4)}${chalk.green('ionic cordova platform --help')}`, `view help page for managing Cordova platforms`],
      [`${indent(4)}${chalk.green('ionic cordova plugin --help')}`, `view help page for managing Cordova plugins`],
      [`${indent(4)}${chalk.green('ionic cordova prepare')}`, `install platforms and plugins listed in ${chalk.bold('config.xml')}`],
    ];

    throw new FatalException(
      `${chalk.green('ionic state')} has been removed.\n\n` +
      `We recommend using Cordova directly to manage Cordova plugins and platforms.\n` +
      `The following commands fulfill the old ${chalk.green('ionic state')} functionality:\n\n` +
      `${columnar(data, {})}\n\n` +
      `See ${chalk.bold('https://cordova.apache.org/docs/en/latest/platform_plugin_versioning_ref/')} for detailed information.\n`
    );
  }
}
