import { CommandMetadata } from '@ionic/cli-utils';

import { RunCommand } from './run';

export class EmulateCommand extends RunCommand {
  async getMetadata(): Promise<CommandMetadata> {
    const metadata = await super.getMetadata();

    return {
      ...metadata,
      name: 'emulate',
      summary: 'Emulate an Ionic project on a simulator/emulator',
    };
  }
}
