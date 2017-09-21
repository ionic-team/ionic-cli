import * as chalk from 'chalk';

import { CommandMap, Namespace } from '@ionic/cli-utils/lib/namespace';

export class ConfigNamespace extends Namespace {
  name = 'config';
  description = 'Manage CLI and project config values';
  longDescription = `
These commands are used to programmatically read and write CLI and project config values.

By default, these commands use your project's ${chalk.bold('ionic.config.json')} file.

To use these commands for the global CLI config file (${chalk.bold('~/.ionic/config.json')}), use the ${chalk.green('--global')} flag.
`;

  commands = new CommandMap([
    ['get', async () => { const { ConfigGetCommand } = await import('./get'); return new ConfigGetCommand(); }],
    ['set', async () => { const { ConfigSetCommand } = await import('./set'); return new ConfigSetCommand(); }],
  ]);
}
