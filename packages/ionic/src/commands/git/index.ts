import { CommandMap, Namespace } from '@ionic/cli-utils/lib/namespace';

export class GitNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'git',
      summary: 'Commands relating to git',
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['clone', async () => { const { GitCloneCommand } = await import('./clone'); return new GitCloneCommand(this, this.env, this.project); }],
      ['remote', async () => { const { GitRemoteCommand } = await import('./remote'); return new GitRemoteCommand(this, this.env, this.project); }],
    ]);
  }
}
