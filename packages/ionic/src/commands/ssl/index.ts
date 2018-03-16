import chalk from 'chalk';

import { NamespaceGroup } from '@ionic/cli-utils';
import { CommandMap, Namespace } from '@ionic/cli-utils/lib/namespace';

export class SSLNamespace extends Namespace {
  async getMetadata() {
    const config = await this.env.config.load();
    const groups: NamespaceGroup[] = [NamespaceGroup.Beta];

    if (!config.features['ssl-commands']) {
      groups.push(NamespaceGroup.Hidden);
    }

    return {
      name: 'ssl',
      description: 'Commands for managing SSL keys & certificates',
      groups,
      longDescription: `
These commands make it easy to generate SSL certificates for using HTTPS with ${chalk.green('ionic serve')}, etc.
      `,
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['generate', async () => { const { SSLGenerateCommand } = await import('./generate'); return new SSLGenerateCommand(this, this.env); }],
      ['g', 'generate'],
    ]);
  }
}
