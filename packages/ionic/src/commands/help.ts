import { CommandLineInputs, CommandLineOptions } from '@ionic/cli-utils';
import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';

@CommandMetadata({
  name: 'help',
  type: 'global',
  description: 'Provides help for a certain command',
  exampleCommands: ['start'],
  inputs: [
    {
      name: 'command',
      description: 'The command you desire help with',
      required: false,
    }
  ],
  visible: false,
})
export class HelpCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { showHelp } = await import('@ionic/cli-utils/lib/help');

    showHelp(this.env, inputs);
  }
}
