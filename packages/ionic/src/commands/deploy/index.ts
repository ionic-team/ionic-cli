import { NamespaceGroup } from '@ionic/cli-framework';
import { CommandMap, Namespace } from '@ionic/cli-utils/lib/namespace';

export class DeployNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'deploy',
      summary: 'Commands for working with Ionic Deploy',
      groups: [NamespaceGroup.Hidden],
      description: ` These commands make it easy to do all things deploy `,
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['manifest', async () => { const { DeployManifestCommand } = await import('./manifest'); return new DeployManifestCommand(this, this.env); }],
    ]);
  }
}
