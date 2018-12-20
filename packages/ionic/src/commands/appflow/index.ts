import chalk from 'chalk';

import { CommandMap, Namespace } from '../../lib/namespace';

export class AppflowNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'appflow',
      summary: 'Appflow functionality',
      description: `
TODO...

Appflow documentation:
- Overview: ${chalk.bold('https://ionicframework.com/docs/appflow/')}
      `,
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['package', async () => { const { PackageCommand } = await import('./package'); return new PackageCommand(this); }],
    ]);
  }
}
