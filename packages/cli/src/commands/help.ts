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
  ],
  isProjectTask: false
})
export class HelpCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {

    const [argv, command] = this.env.namespace.locateCommand(inputs);

    if (command) {
      return this.env.log.msg(formatCommandHelp(command.metadata));
    }

    if (argv.length > 0) {
      /**
       * Load the plugin using the pluginName provided
       */
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


    this.env.log.msg(formatCommandHelp(this.metadata));
  }
};
