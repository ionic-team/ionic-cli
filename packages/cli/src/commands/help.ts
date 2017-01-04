import * as chalk from 'chalk';

import {
  CommandMetadata,
  CommandLineInputs,
  CommandLineOptions,
  formatCommandHelp,
  Command
} from '@ionic/cli-utils';

import { resolvePlugin } from '../lib/plugins';

@CommandMetadata({
  name: 'help',
  description: 'Provides help for a certain command',
  inputs: [
    {
      name: 'command',
      description: 'The command you desire help with',
    }
  ]
})
export class HelpCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {

    // If there are no inputs then show help command help.
    if (inputs.length === 0) {
      return this.env.log.msg(formatCommandHelp(this.metadata));
    }

    const [argv, command] = this.env.namespace.locateCommand(inputs);

    // If the command is located on the global namespace then show its help
    if (command) {
      return this.env.log.msg(formatCommandHelp(command.metadata));
    }

    // Resolve the plugin based on the inputs to help
    try {
      const [plugin, argv] = resolvePlugin(inputs);

      const commandMetadataList = await plugin.getAllCommandMetadata();
      return commandMetadataList
        .filter((cmd: any) => cmd.name === argv[0] || argv.length === 0)
        .forEach((cmd: any) => this.env.log.msg(formatCommandHelp(cmd)));

    } catch (e) {
      this.env.log.error(e);
    }

    return this.env.log.error(`Command not found: ${chalk.bold(argv.join(' '))}.`);
  }
};
