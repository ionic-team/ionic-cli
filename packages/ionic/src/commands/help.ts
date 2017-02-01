import * as chalk from 'chalk';

import {
  CommandMetadata,
  CommandLineInputs,
  CommandLineOptions,
  formatCommandHelp,
  Command,
  validators
} from '@ionic/cli-utils';

import { resolvePlugin } from '../lib/plugins';

@CommandMetadata({
  name: 'help',
  description: 'Provides help for a certain command',
  exampleCommands: ['start'],
  inputs: [
    {
      name: 'command',
      description: 'The command you desire help with',
      validators: [validators.required]
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
      const [plugin, argv] = resolvePlugin(this.env.project.directory, inputs);

      const commandMetadataList = await plugin.getAllCommandMetadata();
      const foundCommandList = commandMetadataList
        .filter((cmd: any) => cmd.name === argv[0] || argv.length === 0);

      // No command was found if the length is zero.
      if (foundCommandList.length === 0) {
        return this.env.log.error(`Unable to provide help on unknown command: ${chalk.bold(argv.join(' '))}`);
      }

      return foundCommandList.forEach((cmd: any) => this.env.log.msg(formatCommandHelp(cmd)));

    } catch (e) {
      return this.env.log.error(`Unable to find command: ${chalk.bold(argv.join(' '))}. It is possible that you are trying\n` +
      `to get help on a project based command and you are not in a project directory.`);
    }
  }
};
