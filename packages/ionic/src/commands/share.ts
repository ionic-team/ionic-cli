import chalk from 'chalk';

import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';

@CommandMetadata({
  name: 'share',
  type: 'global',
  description: '',
  visible: false,
})
export class ShareCommand extends Command {
  async run(): Promise<void> {
    const dashUrl = await this.env.config.getDashUrl();

    throw new FatalException(
      `${chalk.green('ionic share')} has been removed as of CLI 3.0.\n` +
      `The functionality now exists in the Ionic Dashboard: ${chalk.bold(dashUrl)}`
    );
  }
}
