import chalk from 'chalk';

import { CommandMap, Namespace } from '../../lib/namespace';

export class PackageNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'package',
      summary: 'Appflow package functionality',
      description: `
Inteface to execute commands about package builds on Ionic Appflow.

Appflow package documentation:
- Overview: ${chalk.bold('https://ionicframework.com/docs/appflow/package/')}
      `,
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['build', async () => { const { BuildCommand } = await import('./package'); return new BuildCommand(this); }],
    ]);
  }
}
