import { CommandMap, Namespace } from '@ionic/cli-utils/lib/namespace';

export class ConfigNamespace extends Namespace {
  name = 'config';
  description = 'Manage CLI and project config values';

  commands = new CommandMap([
    ['get', async () => { const { ConfigGetCommand } = await import('./get'); return new ConfigGetCommand(); }],
    ['set', async () => { const { ConfigSetCommand } = await import('./set'); return new ConfigSetCommand(); }],
  ]);
}
