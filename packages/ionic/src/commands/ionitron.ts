import { CommandGroup, CommandLineInputs, CommandLineOptions, CommandMetadata } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';

export class IonitronCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'ionitron',
      type: 'global',
      description: 'Print random ionitron messages',
      options: [
        {
          name: 'es',
          description: 'Print in spanish',
          type: Boolean,
        },
      ],
      groups: [CommandGroup.Hidden],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { getIonitronString, ionitronStatements } = await import('@ionic/cli-utils/lib/ionitron');

    const locale = options['es'] ? 'es' : 'en';
    const localeStatements = ionitronStatements[locale];
    const statement = localeStatements[Math.floor(Math.random() * (localeStatements.length))];

    this.env.log.rawmsg(getIonitronString(statement));
  }
}
