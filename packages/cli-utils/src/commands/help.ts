import * as chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, INamespace } from '../definitions';
import { formatCommandHelp } from '../lib/utils/help';
import { Command, CommandMetadata } from '../lib/command/index';
import { locateCommand } from '../lib/namespaces';

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
  constructor(public targetNamespace: INamespace) {
    super();
  }
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [argv, command] = locateCommand(inputs, this.targetNamespace);

    if (command) {
      return this.env.log.msg(formatCommandHelp(command.metadata));
    }

    if (argv.length > 0) {
      return this.env.log.error(`Command not found: ${chalk.bold(argv.join(' '))}.`);
    }

    this.env.log.error(`Command ${chalk.bold(this.metadata.name)} needs a single argument.`);
    this.env.log.msg(formatCommandHelp(this.metadata));
  }
};
