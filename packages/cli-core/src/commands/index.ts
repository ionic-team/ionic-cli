import { ICommandMap, Namespace, CommandMap } from '@ionic/cli-utils';

import { DocsCommand } from './docs';
import { IonitronCommand } from './ionitron';
import { ResourcesCommand } from './resources';
import { ServeCommand } from './serve';

export class CoreNamespace extends Namespace {
  getCommands(): ICommandMap {
    let m = new CommandMap();

    m.set('docs', new DocsCommand());
    m.set('ionitron', new IonitronCommand());
    m.set('resources', new ResourcesCommand());
    m.set('serve', new ServeCommand());

    return m;
  }
}
