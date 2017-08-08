import { CommandMap, Namespace } from '@ionic/cli-utils/lib/namespace';

export class GitNamespace extends Namespace {
  name = 'git';
  description = 'Commands relating to git';

  commands = new CommandMap([
    ['clone', async () => { const { GitCloneCommand } = await import('./clone'); return new GitCloneCommand(); }],
    ['remote', async () => { const { GitRemoteCommand } = await import('./remote'); return new GitRemoteCommand(); }],
  ]);
}
