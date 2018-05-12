import { Command, CommandLineInputs, CommandLineOptions } from '@ionic/cli-framework';

export class BuildCommand extends Command {
  async getMetadata() {
    return {
      name: 'build',
      summary: '',
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions) {
    // Do build
  }
}
