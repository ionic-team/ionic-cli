import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../definitions';
import { input } from '../lib/color';
import { Command } from '../lib/command';

export class LogoutCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'logout',
      type: 'global',
      summary: 'Logout of Ionic Appflow',
      description: `
Remove the Ionic Appflow user token from the CLI config.

Login again with ${input('ionic login')}.

If you need to create an Ionic Appflow account, use ${input('ionic signup')}.
      `,
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!this.env.session.isLoggedIn()) {
      this.env.log.msg('You are already logged out.');
      return;
    }

    await this.env.session.logout();
    this.env.log.ok('You are logged out.');
  }
}
