import { CommandData, CommandLineInputs, CommandLineOptions } from '@ionic/cli-framework';

import { Command } from '../lib';
import { runTask } from '../lib/gulp';

export class BuildCommand extends Command {
  metadata: CommandData = {
    name: 'build',
    description: '',
  };

  async run(inputs: CommandLineInputs, options: CommandLineOptions) {
    await runTask('sass');
  }
}
