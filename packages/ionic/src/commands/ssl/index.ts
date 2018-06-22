import chalk from 'chalk';

import { NamespaceGroup } from '@ionic/cli-framework';
import { CommandMap, Namespace } from '@ionic/cli-utils/lib/namespace';

export class SSLNamespace extends Namespace {
  async getMetadata() {
    const groups: NamespaceGroup[] = [NamespaceGroup.Beta];

    if (!this.env.config.get('features.ssl-commands')) {
      groups.push(NamespaceGroup.Hidden);
    }

    return {
      name: 'ssl',
      summary: 'Commands for managing SSL keys & certificates',
      groups,
      description: `
These commands make it easy to generate SSL certificates for using HTTPS with ${chalk.green('ionic serve')}, etc.
      `,
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['generate', async () => { const { SSLGenerateCommand } = await import('./generate'); return new SSLGenerateCommand(this); }],
      ['g', 'generate'],
    ]);
  }
}
