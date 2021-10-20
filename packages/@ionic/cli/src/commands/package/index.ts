import { MetadataGroup, NamespaceMetadata } from '@ionic/cli-framework';

import { strong } from '../../lib/color';
import { CommandMap, Namespace } from '../../lib/namespace';
import { IONIC_CLOUD_CLI_MIGRATION } from '../../lib/updates';

export class PackageNamespace extends Namespace {
  async getMetadata(): Promise<NamespaceMetadata> {
    return {
      name: 'package',
      summary: 'Appflow package functionality',
      description: `
${IONIC_CLOUD_CLI_MIGRATION}
Interface to execute commands about package builds and deployments on Ionic Appflow.

Appflow package documentation:
- Overview: ${strong('https://ion.link/appflow-package-docs')}
      `,
      groups: [MetadataGroup.PAID, MetadataGroup.DEPRECATED],
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['build', async () => { const { BuildCommand } = await import('./build'); return new BuildCommand(this); }],
      ['deploy', async () => { const { DeployCommand } = await import('./deploy'); return new DeployCommand(this); }],
    ]);
  }
}
