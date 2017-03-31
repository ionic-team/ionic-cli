import { Namespace, CommandMap } from '@ionic/cli-utils';

import { PackageDownloadCommand } from './download';
import { PackageInfoCommand } from './info';
import { PackageListCommand } from './list';

export class PackageNamespace extends Namespace {
  name = 'package';
  commands = new CommandMap([
    ['download', () => new PackageDownloadCommand()],
    ['info', () => new PackageInfoCommand()],
    ['list', () => new PackageListCommand()],
  ]);
}
