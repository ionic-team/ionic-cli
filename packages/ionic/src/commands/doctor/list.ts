import chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';

export class DoctorListCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'list',
      type: 'project',
      summary: 'List all issue identifiers',
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const registry = await this.env.project.getAilmentRegistry(this.env);
    const ailmentIds = registry.ailments.map(ailment => ailment.id);

    this.env.log.rawmsg(ailmentIds.map(id => chalk.green(id)).join('\n'));
  }
}
