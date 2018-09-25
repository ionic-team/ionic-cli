import { OptionGroup } from '@ionic/cli-framework';
import chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../definitions';
import { isSuperAgentError } from '../guards';
import { Command } from '../lib/command';
import { BROWSERS } from '../lib/serve';
import { createRequest } from '../lib/utils/http';

export class DocsCommand extends Command {
  async getMetadata(): Promise<CommandMetadata> {
    return {
      name: 'docs',
      type: 'global',
      summary: 'Open the Ionic documentation website',
      options: [
        {
          name: 'browser',
          summary: `Specifies the browser to use (${BROWSERS.map(b => chalk.green(b)).join(', ')})`,
          aliases: ['w'],
          groups: [OptionGroup.Advanced],
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const opn = await import('opn');

    const browser = options['browser'] ? String(options['browser']) : undefined;

    const homepage = 'https://ionicframework.com/docs';
    const url = this.project ? await this.project.getDocsUrl() : homepage;

    try {
      const { req } = await createRequest('HEAD', url, this.env.config.getHTTPConfig());
      await req;
    } catch (e) {
      if (isSuperAgentError(e) && e.response.status === 404) {
        this.env.log.warn(`Docs not found for your specific version of Ionic. Directing you to docs homepage.`);
        await opn(homepage, { app: browser, wait: false });
        return;
      }

      throw e;
    }

    await opn(url, { app: browser, wait: false });
    this.env.log.ok('Launched Ionic docs in your browser!');
  }
}
