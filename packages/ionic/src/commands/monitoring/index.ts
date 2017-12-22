import { CommandMap, Namespace } from '@ionic/cli-utils/lib/namespace';

export class MonitoringNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'monitoring',
      description: 'Commands relating to Ionic Pro error monitoring',
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['syncmaps', async () => { const { MonitoringSyncSourcemapsCommand } = await import('./syncmaps'); return new MonitoringSyncSourcemapsCommand(this); }],
    ]);
  }
}
