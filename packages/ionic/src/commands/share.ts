import chalk from 'chalk';

import { CommandGroup } from '@ionic/cli-framework';
import { CommandMetadata } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';

export class ShareCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'share',
      type: 'global',
      summary: '',
      groups: [CommandGroup.Hidden],
    };
  }

  async run(): Promise<void> {
    const dashUrl = this.env.config.getDashUrl();

    throw new FatalException(
      `${chalk.green('ionic share')} has been removed.\n` +
      `The functionality now exists in the Ionic Dashboard: ${chalk.bold(dashUrl)}`
    );
  }
}
