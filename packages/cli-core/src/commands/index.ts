import { ICommandMap, Namespace, CommandMap } from '@ionic/cli-utils';

import { DocsCommand } from './docs';
import { IonitronCommand } from './ionitron';
import { ServeCommand } from './serve';
import { GenerateCommand } from './generate';

export class CoreNamespace extends Namespace {
  getCommands(): ICommandMap {
    let m = new CommandMap();

    m.set('docs', new DocsCommand());
    m.set('ionitron', new IonitronCommand());
    m.set('serve', new ServeCommand());
    m.set('generate', new GenerateCommand());

    return m;
  }
}
