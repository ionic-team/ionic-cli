import { CommandGroup } from '@ionic/cli-framework';

import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../definitions';
import { Command } from '../lib/command';

export class IonitronCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'ionitron',
      type: 'global',
      summary: 'Print random ionitron messages',
      options: [
        {
          name: 'es',
          summary: 'Print in spanish',
          type: Boolean,
        },
      ],
      groups: [CommandGroup.Hidden],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { getIonitronString, ionitronStatements } = await import('../lib/ionitron');

    const locale = options['es'] ? 'es' : 'en';
    const localeStatements = ionitronStatements[locale];
    const statement = localeStatements[Math.floor(Math.random() * (localeStatements.length))];

    this.env.log.rawmsg(getIonitronString(statement));
  }
}
