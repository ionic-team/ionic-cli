import { MetadataGroup } from '@ionic/cli-framework';

import { CommandMetadata } from '../definitions';
import { input, strong } from '../lib/color';
import { Command } from '../lib/command';
import { FatalException } from '../lib/errors';

export class ShareCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'share',
      type: 'global',
      summary: '',
      groups: [MetadataGroup.HIDDEN],
    };
  }

  async run(): Promise<void> {
    const dashUrl = this.env.config.getDashUrl();

    throw new FatalException(
      `${input('ionic share')} has been removed.\n` +
      `The functionality now exists in the Ionic Dashboard: ${strong(dashUrl)}`
    );
  }
}
