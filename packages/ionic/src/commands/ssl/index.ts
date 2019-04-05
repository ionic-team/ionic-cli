import { NamespaceGroup } from '@ionic/cli-framework';

import { input } from '../../lib/color';
import { CommandMap, Namespace } from '../../lib/namespace';

export class SSLNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'ssl',
      summary: 'Commands for managing SSL keys & certificates',
      groups: [NamespaceGroup.Experimental],
      description: `
These commands make it easy to manage SSL certificates for using HTTPS with ${input('ionic serve')}.
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
