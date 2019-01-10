import chalk from 'chalk';

import { CommandMap, Namespace } from '../../lib/namespace';

export class DeployNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'deploy',
      summary: 'Appflow Deploy functionality',
      description: `
Interface to execute commands about deploy builds on Ionic Appflow.

Appflow deploy documentation:
- Overview: ${chalk.bold('https://ionicframework.com/docs/appflow/deploy/')}
`,
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['build', async () => { const { BuildCommand } = await import('./build'); return new BuildCommand(this); }],
      ['manifest', async () => { const { DeployManifestCommand } = await import('./manifest'); return new DeployManifestCommand(this); }],
    ]);
  }
}
