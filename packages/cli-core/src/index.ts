import { ICommandMap, Namespace, CommandMap } from '@ionic/cli-utils';

import { DocsCommand } from './commands/docs';
import { IonitronCommand } from './commands/ionitron';
import { ResourcesCommand } from './commands/resources';
import { ServeCommand } from './commands/serve';

export default class IonicNamespace extends Namespace {
  getCommands(): ICommandMap {
    let m = new CommandMap();

    m.set('docs', new DocsCommand());
    m.set('ionitron', new IonitronCommand());
    m.set('resources', new ResourcesCommand());
    m.set('serve', new ServeCommand());

    return m;
  }
}
