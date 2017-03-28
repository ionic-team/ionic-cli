import { Namespace, CommandMap } from '@ionic/cli-utils';

import { PackageListCommand } from './list';

export class PackageNamespace extends Namespace {
  name = 'package';
  commands = new CommandMap([
    ['list', () => new PackageListCommand()],
  ]);
}
