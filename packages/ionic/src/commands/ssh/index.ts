import chalk from 'chalk';

import { CommandMap, Namespace } from '@ionic/cli-utils/lib/namespace';

export class SSHNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'ssh',
      summary: 'Commands for configuring SSH keys',
      description: `
These commands help automate your SSH configuration for Ionic Pro. As an alternative, SSH configuration can be done entirely manually by visiting your Personal Settings${chalk.cyan('[1]')}.

To begin, run ${chalk.green('ionic ssh setup')}, which lets you use existing keys or generate new ones just for Ionic.

${chalk.cyan('[1]')}: ${chalk.bold('https://dashboard.ionicframework.com/settings/ssh-keys')}
      `,
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['generate', async () => { const { SSHGenerateCommand } = await import('./generate'); return new SSHGenerateCommand(this); }],
      ['use', async () => { const { SSHUseCommand } = await import('./use'); return new SSHUseCommand(this); }],
      ['add', async () => { const { SSHAddCommand } = await import('./add'); return new SSHAddCommand(this); }],
      ['delete', async () => { const { SSHDeleteCommand } = await import('./delete'); return new SSHDeleteCommand(this); }],
      ['list', async () => { const { SSHListCommand } = await import('./list'); return new SSHListCommand(this); }],
      ['setup', async () => { const { SSHSetupCommand } = await import('./setup'); return new SSHSetupCommand(this); }],
      ['ls', 'list'],
      ['remove', 'delete'],
      ['rm', 'delete'],
      ['g', 'generate'],
    ]);
  }
}
