import { Namespace, CommandMap, ICommandMap } from '@ionic/cli-utils';

import { BuildCommand } from './build';
import { ListCommand } from './list';
import { DownloadCommand } from './download';
import { InfoCommand } from './info';

export class PackageNamespace extends Namespace {
  getCommands(): ICommandMap {
    let m = new CommandMap();

    m.set('build', new BuildCommand());
    m.set('list', new ListCommand());
    m.set('download', new DownloadCommand());
    m.set('info', new InfoCommand());

    return m;
  }
}
