import chalk from 'chalk';

import { PROJECT_FILE } from '../../constants';
import { CommandMap, Namespace } from '../../lib/namespace';

export class ConfigNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'config',
      summary: 'Manage CLI and project config values',
      description: `
These commands are used to programmatically read, write, and delete CLI and project config values.

By default, these commands use your project's ${chalk.bold(PROJECT_FILE)} file.

To use these commands for the global CLI config file (${chalk.bold('~/.ionic/config.json')}), use the ${chalk.green('--global')} flag.
      `,
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['get', async () => { const { ConfigGetCommand } = await import('./get'); return new ConfigGetCommand(this); }],
      ['set', async () => { const { ConfigSetCommand } = await import('./set'); return new ConfigSetCommand(this); }],
      ['unset', async () => { const { ConfigUnsetCommand } = await import('./unset'); return new ConfigUnsetCommand(this); }],
    ]);
  }
}
