import { OptionGroup } from '@ionic/cli-framework';
import { CommandLineInputs, CommandLineOptions, CommandMetadata, isSuperAgentError } from '@ionic/cli-utils';
import { Command } from '@ionic/cli-utils/lib/command';
import { BROWSERS } from '@ionic/cli-utils/lib/serve';
import { createRequest } from '@ionic/cli-utils/lib/utils/http';
import chalk from 'chalk';

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
    const config = await this.env.config.load();

    const url = await this.env.project.getDocsUrl();

    try {
      const { req } = await createRequest('HEAD', url, config);
      await req;
    } catch (e) {
      if (isSuperAgentError(e) && e.response.status === 404) {
        this.env.log.warn(`Docs not found for your specific version of Ionic. Directing you to docs homepage.`);
        await opn('https://ionicframework.com/docs', { app: browser, wait: false });
        return;
      }

      throw e;
    }

    await opn(url, { app: browser, wait: false });
    this.env.log.ok('Launched Ionic docs in your browser!');
  }
}
