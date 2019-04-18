import { MetadataGroup } from '@ionic/cli-framework';

import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../definitions';
import { Command } from '../lib/command';

export class VersionCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'version',
      type: 'global',
      summary: 'Returns the current CLI version',
      groups: [MetadataGroup.HIDDEN],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    // can't use logger--see https://github.com/ionic-team/ionic-cli/issues/2507
    process.stdout.write(this.env.ctx.version + '\n');
  }
}
