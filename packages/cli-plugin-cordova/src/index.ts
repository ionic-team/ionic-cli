import { ICommandMap, Namespace, CommandMap } from '@ionic/cli';

import { EmulateCommand } from './commands/emulate';

export default class CordovaNamespace extends Namespace {
  getCommands(): ICommandMap {
    let m = new CommandMap();

    m.set('emulate', new EmulateCommand());

    return m;
  }
}
