import { CommandMap, ICommandMap, Namespace } from '@ionic/cli-utils';

import { GitCloneCommand } from './clone';
import { GitRemoteCommand } from './remote';

export class GitNamespace extends Namespace {
  getCommands(): ICommandMap {
    let m = new CommandMap();

    m.set('clone', new GitCloneCommand());
    m.set('remote', new GitRemoteCommand());

    return m;
  }
}
