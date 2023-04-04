import { MetadataGroup } from '@ionic/cli-framework';

import { strong } from '../../lib/color';
import { CommandMap, Namespace } from '../../lib/namespace';

export class LiveUpdatesNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'live-update',
      summary: 'Ionic Live Updates functionality',
      description: `
These commands integrate with Ionic Cloud to configure the Live Updates plugin in your project and run remote builds.

Ionic Live Updates documentation:
- Overview: ${strong('https://ion.link/appflow-deploy-docs')}
`,
      groups: [MetadataGroup.PAID],
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['add', async () => { const { AddCommand } = await import('./add'); return new AddCommand(this); }],
      ['configure', async () => { const { ConfigureCommand } = await import('./configure'); return new ConfigureCommand(this); }],
      ['manifest', async () => { const { LiveUpdatesManifestCommand } = await import('./manifest'); return new LiveUpdatesManifestCommand(this); }],
    ]);
  }
}
