import { Namespace, CommandMap } from '@ionic/cli-utils';

import { PackageListCommand } from './list';

export class PackageNamespace extends Namespace {
  name = 'package';

  getCommands() {
    let m = new CommandMap();

    m.set('list', new PackageListCommand());

    return m;
  }
}
