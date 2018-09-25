import { NamespaceGroup } from '@ionic/cli-framework';

import { CommandMap, Namespace } from '../../lib/namespace';

export class MonitoringNamespace extends Namespace {
  async getMetadata() {
    const groups: NamespaceGroup[] = [];

    if (!this.project || this.project.type !== 'ionic-angular') {
      groups.push(NamespaceGroup.Hidden);
    }

    return {
      name: 'monitoring',
      summary: 'Commands relating to Ionic Pro error monitoring',
      groups,
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['syncmaps', async () => { const { MonitoringSyncSourcemapsCommand } = await import('./syncmaps'); return new MonitoringSyncSourcemapsCommand(this); }],
    ]);
  }
}
