import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  createRequest,
  isSuperAgentError,
} from '@ionic/cli-utils';

import { load } from '../lib/modules';

@CommandMetadata({
  name: 'docs',
  type: 'global',
  description: 'Open the Ionic documentation website',
})
export class DocsCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let url = '';
    const opn = load('opn');

    const docsHomepage = 'https://ionicframework.com/docs';
    const results = await this.env.hooks.fire('command:docs', { cmd: this, env: this.env, inputs, options });

    if (results.length === 0) {
      url = docsHomepage;
    } else {
      [ url ] = results;
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

    opn(url, { wait: false });
    this.env.log.ok('Launched Ionic docs in your browser!');
  }
}
