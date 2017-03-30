import { Namespace, CommandMap } from '@ionic/cli-utils';

import { PackageListCommand } from './list';
import { PackageDownloadCommand } from './download';

export class PackageNamespace extends Namespace {
  name = 'package';
  commands = new CommandMap([
    ['download', () => new PackageDownloadCommand()],
    ['list', () => new PackageListCommand()],
  ]);
}
