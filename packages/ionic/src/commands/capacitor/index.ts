import chalk from 'chalk';

import { NamespaceGroup } from '@ionic/cli-framework';
import { CommandMap, Namespace } from '@ionic/cli-utils/lib/namespace';

export class CapacitorNamespace extends Namespace {
  async getMetadata() {
    const groups: string[] = [NamespaceGroup.Beta];

    if (!this.env.config.get('features.capacitor-commands')) {
      groups.push(NamespaceGroup.Hidden);
    }

    return {
      name: 'capacitor',
      summary: 'Capacitor functionality',
      description: `
These commands integrate with Capacitor, Ionic's new native layer project which provides an alternative to Cordova for native functionality in your app.

Learn more about Capacitor:
- Main documentation: ${chalk.bold('https://capacitor.ionicframework.com/')}
      `,
      groups,
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['add', async () => { const { AddCommand } = await import('./add'); return new AddCommand(this); }],
      ['copy', async () => { const { CopyCommand } = await import('./copy'); return new CopyCommand(this); }],
      ['open', async () => { const { OpenCommand } = await import('./open'); return new OpenCommand(this); }],
      ['sync', async () => { const { SyncCommand } = await import('./sync'); return new SyncCommand(this); }],
      ['update', async () => { const { UpdateCommand } = await import('./update'); return new UpdateCommand(this); }],
    ]);
  }
}
