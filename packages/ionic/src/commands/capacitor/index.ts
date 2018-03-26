import chalk from 'chalk';

import { NamespaceGroup } from '@ionic/cli-utils';
import { CommandMap, Namespace } from '@ionic/cli-utils/lib/namespace';

export class CapacitorNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'capacitor',
      summary: 'Capacitor functionality',
      description: `
These commands integrate with Capacitor, Ionic's new native layer project which provides an alternative to Cordova for native functionality in your app.

Learn more about Capacitor:
- Main documentation: ${chalk.bold('https://capacitor.ionicframework.com/')}
      `,
      groups: [NamespaceGroup.Beta]
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['init', async () => { const { InitCommand } = await import('./init'); return new InitCommand(this, this.env); }],
      ['add', async () => { const { AddCommand } = await import('./add'); return new AddCommand(this, this.env); }],
      ['copy', async () => { const { CopyCommand } = await import('./copy'); return new CopyCommand(this, this.env); }],
      ['open', async () => { const { OpenCommand } = await import('./open'); return new OpenCommand(this, this.env); }],
      ['sync', async () => { const { SyncCommand } = await import('./sync'); return new SyncCommand(this, this.env); }],
      ['update', async () => { const { UpdateCommand } = await import('./update'); return new UpdateCommand(this, this.env); }]
    ]);
  }
}
