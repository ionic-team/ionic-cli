import { prettyPath } from '@ionic/utils-terminal';
import * as path from 'path';

import { PROJECT_FILE } from '../../constants';
import { input, strong } from '../../lib/color';
import { DEFAULT_CONFIG_DIRECTORY } from '../../lib/config';
import { CommandMap, Namespace } from '../../lib/namespace';

export class ConfigNamespace extends Namespace {
  async getMetadata() {
    const projectFile = this.project ? prettyPath(this.project.filePath) : PROJECT_FILE;

    return {
      name: 'config',
      summary: 'Manage CLI and project config values',
      description: `
These commands are used to programmatically read, write, and delete CLI and project config values.

By default, these commands use your project's ${strong(prettyPath(projectFile))} file.

To use these commands for the global CLI config file (${strong(path.join(DEFAULT_CONFIG_DIRECTORY, 'config.json'))}), use the ${input('--global')} flag.
      `,
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['get', async () => { const { ConfigGetCommand } = await import('./get'); return new ConfigGetCommand(this); }],
      ['set', async () => { const { ConfigSetCommand } = await import('./set'); return new ConfigSetCommand(this); }],
      ['unset', async () => { const { ConfigUnsetCommand } = await import('./unset'); return new ConfigUnsetCommand(this); }],
      ['delete', 'unset'],
      ['del', 'unset'],
    ]);
  }
}
