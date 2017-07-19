import { CommandMap, Namespace } from '@ionic/cli-utils';

import { GitCloneCommand } from './clone';
import { GitRemoteCommand } from './remote';

export class GitNamespace extends Namespace {
  name = 'git';
  source = 'ionic';

  commands = new CommandMap([
    ['clone', () => new GitCloneCommand()],
    ['remote', () => new GitRemoteCommand()],
  ]);
}
