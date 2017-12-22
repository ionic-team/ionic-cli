import chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';

export class DoctorListCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'list',
      type: 'project',
      description: 'List all issue identifiers',
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { Ailments } = await import('@ionic/cli-utils/lib/doctor/ailments');

    const ailmentIds = Ailments.ALL.map(Ailment => new Ailment().id);

    this.env.log.msg(ailmentIds.map(id => chalk.green(id)).join('\n'));
  }
}
