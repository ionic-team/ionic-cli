import { MetadataGroup } from '@ionic/cli-framework';

import { CommandLineInputs, CommandLineOptions, CommandMetadata } from '../definitions';
import { isSuperAgentError } from '../guards';
import { input } from '../lib/color';
import { Command } from '../lib/command';
import { openUrl } from '../lib/open';
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
          summary: `Specifies the browser to use (${BROWSERS.map(b => input(b)).join(', ')})`,
          aliases: ['w'],
          groups: [MetadataGroup.ADVANCED],
        },
      ],
    };
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const browser = options['browser'] ? String(options['browser']) : undefined;

    const homepage = 'https://ion.link/docs';
    const url = this.project ? await this.project.getDocsUrl() : homepage;

    this.env.log.warn(`The ${input('ionic docs')} command has been deprecated and will be removed in an upcoming major release of the Ionic CLI. Developers should bookmark ${url} in their browser for easy access.`);

    try {
      const { req } = await createRequest('HEAD', url, this.env.config.getHTTPConfig());
      await req;
    } catch (e) {
      if (isSuperAgentError(e) && e.response.status === 404) {
        this.env.log.warn(`Docs not found for your specific version of Ionic. Directing you to docs homepage.`);
        await openUrl(homepage, { app: browser });
        return;
      }

      throw e;
    }

    await openUrl(url, { app: browser });
    this.env.log.ok('Launched Ionic docs in your browser!');
  }
}
