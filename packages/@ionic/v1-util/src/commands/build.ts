import { Command, CommandLineInputs, CommandLineOptions } from '@ionic/cli-framework';

import { runTask } from '../lib/gulp';

export class BuildCommand extends Command {
  async getMetadata() {
    return {
      name: 'build',
      description: '',
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions) {
    await runTask('sass');
  }
}
