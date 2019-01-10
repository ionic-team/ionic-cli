import { CommandMap, Namespace } from '../../lib/namespace';

export class DeployNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'deploy',
      summary: 'Commands for working with Ionic Deploy',
      description: ` These commands make it easy to do all things deploy `,
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['build', async () => { const { BuildCommand } = await import('./build'); return new BuildCommand(this); }],
      ['manifest', async () => { const { DeployManifestCommand } = await import('./manifest'); return new DeployManifestCommand(this); }],
    ]);
  }
}
