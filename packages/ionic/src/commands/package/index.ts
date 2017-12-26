import chalk from 'chalk';

import { NamespaceGroup } from '@ionic/cli-utils';
import { CommandMap, Namespace } from '@ionic/cli-utils/lib/namespace';

import { DEPRECATION_NOTICE } from './common';

export class PackageNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'package',
      description: 'Commands for Ionic Package',
      longDescription: `${chalk.bold.yellow('WARNING')}: ${DEPRECATION_NOTICE}`,
      groups: [NamespaceGroup.Deprecated],
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['build', async () => { const { PackageBuildCommand } = await import('./build'); return new PackageBuildCommand(this, this.env); }],
      ['download', async () => { const { PackageDownloadCommand } = await import('./download'); return new PackageDownloadCommand(this, this.env); }],
      ['info', async () => { const { PackageInfoCommand } = await import('./info'); return new PackageInfoCommand(this, this.env); }],
      ['list', async () => { const { PackageListCommand } = await import('./list'); return new PackageListCommand(this, this.env); }],
    ]);
  }
}
