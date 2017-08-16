import { CommandMap, Namespace } from '@ionic/cli-utils/lib/namespace';

export class MonitoringNamespace extends Namespace {
  name = 'monitoring';
  description = 'Commands relating to Ionic Pro error monitoring';

  commands = new CommandMap([
    ['syncmaps', async () => { const { MonitoringSyncSourcemapsCommand } = await import('./syncmaps'); return new MonitoringSyncSourcemapsCommand(); }],
  ]);
}
