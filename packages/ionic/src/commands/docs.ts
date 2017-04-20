import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  createRequest,
  isSuperAgentError,
} from '@ionic/cli-utils';

import { load } from '../lib/modules';

/**
 * Metadata about the docs command
 */
@CommandMetadata({
  name: 'docs',
  type: 'global',
  description: 'Open the Ionic documentation website',
})
export class DocsCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const opn = load('opn');

    const docsHomepage = 'https://ionicframework.com/docs';
    const results = await this.env.hooks.fire('command:docs', { env: this.env, inputs, options });
    const [ url ] = results;

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
  }
}
