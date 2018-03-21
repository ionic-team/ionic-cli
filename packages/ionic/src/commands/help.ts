import chalk from 'chalk';

import { CommandGroup, CommandLineInputs, CommandLineOptions, CommandMetadata, isCommand } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';

export class HelpCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'help',
      type: 'global',
      summary: 'Provides help for a certain command',
      exampleCommands: ['start'],
      inputs: [
        {
          name: 'command',
          summary: 'The command you desire help with',
        },
      ],
      groups: [CommandGroup.Hidden],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { CommandHelpFormatter, NamespaceHelpFormatter } = await import('@ionic/cli-utils/lib/help');
    const location = await this.namespace.locate(inputs);

    if (isCommand(location.obj)) {
      const formatter = new CommandHelpFormatter({ location, command: location.obj });
      this.env.log.rawmsg(await formatter.format());
    } else {
      if (location.args.length > 0) {
        this.env.log.error(
          `Unable to find command: ${chalk.green(inputs.join(' '))}` +
          (this.env.project.directory ? '' : '\nYou may need to be in an Ionic project directory.')
        );
      }

      const isLoggedIn = await this.env.session.isLoggedIn();
      const now = new Date();
      const prefix = isLoggedIn ? chalk.blue('PRO') + ' ' : '';
      const version = this.env.ctx.version;
      const suffix = now.getMonth() === 9 && now.getDate() === 31 ? ' 🎃' : '';

      const formatter = new NamespaceHelpFormatter({
        inProject: this.env.project.directory ? true : false,
        version: prefix + version + suffix,
        location,
        namespace: location.obj,
      });

      this.env.log.rawmsg(await formatter.format());
    }
  }
}
