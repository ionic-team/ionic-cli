import { MetadataGroup } from '@ionic/cli-framework';

import { strong } from '../../lib/color';
import { CommandMap, Namespace } from '../../lib/namespace';

export class PackageNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'package',
      summary: 'Appflow package functionality',
      description: `
Interface to execute commands about package builds on Ionic Appflow.

Appflow package documentation:
- Overview: ${strong('https://ion.link/appflow-package-docs')}
      `,
      groups: [MetadataGroup.PAID],
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['build', async () => { const { BuildCommand } = await import('./build'); return new BuildCommand(this); }],
    ]);
  }
}
