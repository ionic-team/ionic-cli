import * as chalk from 'chalk';

import { CommandMap, Namespace } from '@ionic/cli-utils/lib/namespace';

export class PackageNamespace extends Namespace {
  name = 'package';
  description = 'Commands for Ionic Package';
  deprecated = true;
  longDescription = `
${chalk.yellow('WARNING')}: Ionic Cloud is deprecated and will reach end-of-life on January 31st, 2018. These commands will not be supported afterwards. Ionic Pro takes a different approach to the Ionic Package service. See the Package documentation for details: ${chalk.bold('https://ionicframework.com/docs/pro/package/')}
`;

  commands = new CommandMap([
    ['build', async () => { const { PackageBuildCommand } = await import('./build'); return new PackageBuildCommand(); }],
    ['download', async () => { const { PackageDownloadCommand } = await import('./download'); return new PackageDownloadCommand(); }],
    ['info', async () => { const { PackageInfoCommand } = await import('./info'); return new PackageInfoCommand(); }],
    ['list', async () => { const { PackageListCommand } = await import('./list'); return new PackageListCommand(); }],
  ]);
}
