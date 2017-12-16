import chalk from 'chalk';

import { CommandMap, Namespace } from '@ionic/cli-utils/lib/namespace';

import { DEPRECATION_NOTICE } from './common';

export class PackageNamespace extends Namespace {
  metadata = {
    name: 'package',
    description: 'Commands for Ionic Package',
    longDescription: `${chalk.bold.yellow('WARNING')}: ${DEPRECATION_NOTICE}`,
    deprecated: true,
  };

  commands = new CommandMap([
    ['build', async () => { const { PackageBuildCommand } = await import('./build'); return new PackageBuildCommand(); }],
    ['download', async () => { const { PackageDownloadCommand } = await import('./download'); return new PackageDownloadCommand(); }],
    ['info', async () => { const { PackageInfoCommand } = await import('./info'); return new PackageInfoCommand(); }],
    ['list', async () => { const { PackageListCommand } = await import('./list'); return new PackageListCommand(); }],
  ]);
}
