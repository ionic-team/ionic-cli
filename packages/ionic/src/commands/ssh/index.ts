import { CommandMap, Namespace } from '@ionic/cli-utils';

import { SSHGenerateCommand } from './generate';
import { SSHUseCommand } from './use';
import { SSHAddCommand } from './add';
import { SSHDeleteCommand } from './delete';
import { SSHListCommand } from './list';
import { SSHSetupCommand } from './setup';

export class SSHNamespace extends Namespace {
  name = 'ssh';
  source = 'ionic';

  commands = new CommandMap([
    ['generate', () => new SSHGenerateCommand()],
    ['use', () => new SSHUseCommand()],
    ['add', () => new SSHAddCommand()],
    ['delete', () => new SSHDeleteCommand()],
    ['list', () => new SSHListCommand()],
    ['setup', () => new SSHSetupCommand()],
    ['ls', 'list'],
    ['remove', 'delete'],
    ['rm', 'delete'],
  ]);
}
