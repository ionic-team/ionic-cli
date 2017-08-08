import { CommandMap, Namespace } from '@ionic/cli-utils/lib/namespace';

export class SSHNamespace extends Namespace {
  name = 'ssh';
  description = 'Commands for configuring SSH keys';

  commands = new CommandMap([
    ['generate', async () => { const { SSHGenerateCommand } = await import('./generate'); return new SSHGenerateCommand(); }],
    ['use', async () => { const { SSHUseCommand } = await import('./use'); return new SSHUseCommand(); }],
    ['add', async () => { const { SSHAddCommand } = await import('./add'); return new SSHAddCommand(); }],
    ['delete', async () => { const { SSHDeleteCommand } = await import('./delete'); return new SSHDeleteCommand(); }],
    ['list', async () => { const { SSHListCommand } = await import('./list'); return new SSHListCommand(); }],
    ['setup', async () => { const { SSHSetupCommand } = await import('./setup'); return new SSHSetupCommand(); }],
    ['ls', 'list'],
    ['remove', 'delete'],
    ['rm', 'delete'],
  ]);
}
