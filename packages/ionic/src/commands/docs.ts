import chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, OptionGroup, isSuperAgentError } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { BROWSERS } from '@ionic/cli-utils/lib/serve';

export class DocsCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'docs',
      type: 'global',
      description: 'Open the Ionic documentation website',
      options: [
        {
          name: 'browser',
          description: `Specifies the browser to use (${BROWSERS.map(b => chalk.green(b)).join(', ')})`,
          aliases: ['w'],
          groups: [OptionGroup.Advanced],
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const opn = await import('opn');
    const { createRequest } = await import('@ionic/cli-utils/lib/http');

    const browser = options['browser'] ? String(options['browser']) : undefined;
    const config = await this.env.config.load();

    const url = await this.env.project.getDocsUrl();

    try {
      const { req } = await createRequest('HEAD', url, config);
      await req;
    } catch (e) {
      if (isSuperAgentError(e) && e.response.status === 404) {
        this.env.log.warn(`Docs not found for your specific version of Ionic. Directing you to docs homepage.`);
        opn('https://ionicframework.com/docs', { app: browser, wait: false });
        return;
      }

      throw e;
    }

    await opn(url, { app: browser, wait: false });
    this.env.log.ok('Launched Ionic docs in your browser!');
  }
}
