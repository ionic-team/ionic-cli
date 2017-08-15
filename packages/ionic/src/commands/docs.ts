import * as chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions } from '@ionic/cli-utils';
import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';
import { BROWSERS } from '@ionic/cli-utils/lib/serve';

@CommandMetadata({
  name: 'docs',
  type: 'global',
  description: 'Open the Ionic documentation website',
  options: [
    {
      name: 'browser',
      description: `Specifies the browser to use (${BROWSERS.map(b => chalk.green(b)).join(', ')})`,
      aliases: ['w'],
    },
  ],
})
export class DocsCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const { isSuperAgentError } = await import('@ionic/cli-utils/guards');
    const { createRequest } = await import('@ionic/cli-utils/lib/utils/http');
    const browser = options['browser'] ? String(options['browser']) : undefined;

    const opn = await import('opn');

    const docsHomepage = 'https://ionicframework.com/docs';
    let url = docsHomepage;

    const project = this.env.project.directory ? await this.env.project.load() : undefined;

    if (project) {
      if (project.type === 'ionic1') {
        url = 'https://ionicframework.com/docs/v1/';
      } else if (project.type === 'ionic-angular') {
        url = 'https://ionicframework.com/docs/api'; // TODO: can know framework version, HEAD request, etc
      }
    }

    try {
      await createRequest('head', url);
    } catch (e) {
      if (isSuperAgentError(e)) {
        if (e.response.status === 404) {
          this.env.log.warn(`Docs not found for your specific version of Ionic. Directing you to latest docs.`);
          opn(`${docsHomepage}/api`, { wait: false });
          return;
        }
      }

      throw e;
    }

    await opn(url, { app: browser, wait: false });
    this.env.log.ok('Launched Ionic docs in your browser!');
  }
}
