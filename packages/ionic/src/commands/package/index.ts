import { Namespace, CommandMap } from '@ionic/cli-utils';

import { PackageBuildCommand } from './build';
import { PackageDownloadCommand } from './download';
import { PackageInfoCommand } from './info';
import { PackageListCommand } from './list';

export class PackageNamespace extends Namespace {
  name = 'package';
  source = 'ionic';

  commands = new CommandMap([
    ['build', () => new PackageBuildCommand()],
    ['download', () => new PackageDownloadCommand()],
    ['info', () => new PackageInfoCommand()],
    ['list', () => new PackageListCommand()],
  ]);
}
