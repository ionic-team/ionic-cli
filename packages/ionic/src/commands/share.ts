import chalk from 'chalk';

import { CommandMetadata } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';

export class ShareCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'share',
      type: 'global',
      description: '',
      visible: false,
    };
  }

  async run(): Promise<void> {
    const dashUrl = await this.env.config.getDashUrl();

    throw new FatalException(
      `${chalk.green('ionic share')} has been removed as of CLI 3.0.\n` +
      `The functionality now exists in the Ionic Dashboard: ${chalk.bold(dashUrl)}`
    );
  }
}
