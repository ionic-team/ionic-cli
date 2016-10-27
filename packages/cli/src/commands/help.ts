import * as chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions } from '../definitions';

import { Command, CommandMetadata } from '../lib/command';
import { formatCommandHelp } from '../lib/help';

@CommandMetadata({
  name: 'help',
  description: 'Provides help for a certain command',
  inputs: [
    {
      name: 'command',
      description: 'The command you desire help with',
    }
  ],
  isProjectTask: false
})
export class HelpCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [argv, command] = this.cli.resolve(inputs);

    if (command) {
      this.env.log.msg(formatCommandHelp(command.metadata));
    } else {
      if (argv.length > 0) {
        this.env.log.error(`Command not found: ${chalk.bold(argv[0])}.`);
      } else {
        this.env.log.error(`Command ${chalk.bold(this.metadata.name)} needs a single argument.`);
        this.env.log.msg(formatCommandHelp(this.metadata));
      }
    }
  }
}
