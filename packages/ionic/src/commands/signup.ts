import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../definitions';
import { strong } from '../lib/color';
import { Command } from '../lib/command';
import { open } from '../lib/open';

export class SignupCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'signup',
      type: 'global',
      summary: 'Create an account for Ionic Appflow',
      description: `
Learn more about Ionic Appflow: ${strong('https://ion.link/appflow')}

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

    await open(`${dashUrl}/signup?source=cli`);

    this.env.log.ok('Launched signup form in your browser!');
  }
}
