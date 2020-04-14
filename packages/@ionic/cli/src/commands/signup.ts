import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../definitions';
import { Command } from '../lib/command';
import { openUrl } from '../lib/open';

export class SignupCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'signup',
      type: 'global',
      summary: 'Create an Ionic account',
      description: `
If you are having issues signing up, please get in touch with our Support[^support-request].
      `,
      footnotes: [
        {
          id: 'support-request',
          url: 'https://ion.link/support-request',
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const dashUrl = this.env.config.getDashUrl();

    await openUrl(`${dashUrl}/signup?source=cli`);

    this.env.log.ok('Launched signup form in your browser!');
  }
}
