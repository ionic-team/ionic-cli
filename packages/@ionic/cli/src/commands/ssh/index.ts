import { input } from '../../lib/color';
import { CommandMap, Namespace } from '../../lib/namespace';

export class SSHNamespace extends Namespace {
  async getMetadata() {
    const dashUrl = this.env.config.getDashUrl();

    return {
      name: 'ssh',
      summary: 'Commands for configuring SSH keys',
      description: `
These commands help automate your SSH configuration for Ionic. As an alternative, SSH configuration can be done entirely manually by visiting your Personal Settings[^dashboard-settings-ssh-keys].

To begin, run ${input('ionic ssh setup')}, which lets you use existing keys or generate new ones just for Ionic.
      `,
      footnotes: [
        {
          id: 'dashboard-settings-ssh-keys',
          url: `${dashUrl}/settings/ssh-keys`,
        },
      ],
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
