import { MetadataGroup } from '@ionic/cli-framework';

import { CommandMap, Namespace } from '../../lib/namespace';

export class MonitoringNamespace extends Namespace {
  async getMetadata() {
    const groups: MetadataGroup[] = [];

    if (!this.project || this.project.type !== 'ionic-angular') {
      groups.push(MetadataGroup.HIDDEN);
    }

    return {
      name: 'monitoring',
      summary: 'Commands relating to Ionic Appflow Error Monitoring',
      groups,
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['syncmaps', async () => { const { MonitoringSyncSourcemapsCommand } = await import('./syncmaps'); return new MonitoringSyncSourcemapsCommand(this); }],
    ]);
  }
}
