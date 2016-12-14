import { CommandMap, ICommandMap, Namespace } from '@ionic/cli-utils';

import { SSHGenerateCommand } from './generate';
import { SSHUseCommand } from './use';
import { SSHAddCommand } from './add';
import { SSHDeleteCommand } from './delete';
import { SSHListCommand } from './list';
import { SSHSetupCommand } from './setup';

// TODO
// name: 'ssh',
// description: 'Generate and manage SSH keys, configure local SSH authentication',

export class SSHNamespace extends Namespace {
  getCommands(): ICommandMap {
    let m = new CommandMap();

    m.set('generate', new SSHGenerateCommand());
    m.set('use', new SSHUseCommand());
    m.set('add', new SSHAddCommand());
    m.set('delete', new SSHDeleteCommand());
    m.set('list', new SSHListCommand());
    m.set('setup', new SSHSetupCommand());

    return m;
  }
}
