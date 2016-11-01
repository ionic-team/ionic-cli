import { CommandMap, ICommandMap, Namespace } from '@ionic/cli';

import { GitRemoteCommand } from './remote';

export class GitNamespace extends Namespace {
  getCommands(): ICommandMap {
    let m = new CommandMap();

    m.set('remote', new GitRemoteCommand());

    return m;
  }
}
