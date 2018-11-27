import chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../definitions';
import { Command } from '../lib/command';

export class SignupCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'signup',
      type: 'global',
      summary: 'Create an account for Ionic Appflow',
      description: `
Learn more about Ionic Appflow: ${chalk.bold('https://ionicframework.com/appflow')}

If you are having issues signing up, please get in touch with our Support${chalk.cyan('[1]')}.

${chalk.cyan('[1]')}: ${chalk.bold('https://ionicframework.com/support/request')}
      `,
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const opn = await import('opn');
    const dashUrl = this.env.config.getDashUrl();

    await opn(`${dashUrl}/signup?source=cli`, { wait: false });

    this.env.log.ok('Launched signup form in your browser!');
  }
}
