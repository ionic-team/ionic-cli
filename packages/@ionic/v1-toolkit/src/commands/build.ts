import { Command, CommandLineInputs, CommandLineOptions } from '@ionic/cli-framework';

import { hasTask, runTask } from '../lib/gulp';

export class BuildCommand extends Command {
  async getMetadata() {
    return {
      name: 'build',
      summary: '',
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions) {
    if (await hasTask('ionic:build:before')) {
      await runTask('ionic:build:before');
    }

    await runTask('sass');

    if (await hasTask('ionic:build:after')) {
      await runTask('ionic:build:after');
    }
  }
}
