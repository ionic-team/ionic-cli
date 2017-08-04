import { CommandMap, Namespace } from '@ionic/cli-utils/lib/namespace';

export class PackageNamespace extends Namespace {
  name = 'package';
  description = 'Commands for Ionic Package';

  commands = new CommandMap([
    ['build', async () => { const { PackageBuildCommand } = await import('./build'); return new PackageBuildCommand(); }],
    ['download', async () => { const { PackageDownloadCommand } = await import('./download'); return new PackageDownloadCommand(); }],
    ['info', async () => { const { PackageInfoCommand } = await import('./info'); return new PackageInfoCommand(); }],
    ['list', async () => { const { PackageListCommand } = await import('./list'); return new PackageListCommand(); }],
  ]);
}
