import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  showHelp,
} from '@ionic/cli-utils';

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
    showHelp(this.env, inputs);
  }
}
