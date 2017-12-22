import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';

export class HelpCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'help',
      type: 'global',
      description: 'Provides help for a certain command',
      exampleCommands: ['start'],
      inputs: [
        {
          name: 'command',
          description: 'The command you desire help with',
        },
      ],
      visible: false,
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { showHelp } = await import('@ionic/cli-utils/lib/help');

    await showHelp(this.env, inputs);
  }
}
