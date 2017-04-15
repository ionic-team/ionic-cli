import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  createRequest,
  isSuperAgentError,
  readIonicAngularPackageJsonFile,
} from '@ionic/cli-utils';

import { load } from '../lib/modules';

/**
 * Metadata about the docs command
 */
@CommandMetadata({
  name: 'docs',
  description: 'Open the Ionic documentation website',
  requiresProject: true
})
export class DocsCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const opn = load('opn');
    const ionicAngularPackageJson = await readIonicAngularPackageJsonFile();
    const docsHomepage = 'https://ionicframework.com/docs';
    const version = ionicAngularPackageJson.version;
    const url = `${docsHomepage}/${version}/api`;

    try {
      await createRequest('head', url);
    } catch (e) {
      if (isSuperAgentError(e)) {
        if (e.response.status === 404) {
          this.env.log.warn(`Docs for Ionic ${version} not found. Directing you to latest docs.`);
          opn(`${docsHomepage}/api`, { wait: false });
          return;
        }
      }

      throw e;
    }

    opn(url, { wait: false });
  }
}
