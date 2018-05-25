import chalk from 'chalk';

import { NamespaceGroup } from '@ionic/cli-framework';
import { CommandMap, Namespace } from '@ionic/cli-utils/lib/namespace';

export class CordovaNamespace extends Namespace {
  async getMetadata() {
    const groups: string[] = [];

    if (this.env.project.type === 'angular') {
      groups.push(NamespaceGroup.Experimental);
    }

    return {
      name: 'cordova',
      summary: 'Cordova functionality',
      description: `
These commands integrate with Apache Cordova, which brings native functionality to your app. Aside from ${chalk.green('ionic cordova resources')}, these commands all wrap the Cordova CLI.

Cordova Reference documentation:
- Overview: ${chalk.bold('https://cordova.apache.org/docs/en/latest/guide/overview/index.html')}
- CLI documentation: ${chalk.bold('https://cordova.apache.org/docs/en/latest/reference/cordova-cli/')}
      `,
      groups,
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['build', async () => { const { BuildCommand } = await import('./build'); return new BuildCommand(this, this.env); }],
      ['compile', async () => { const { CompileCommand } = await import('./compile'); return new CompileCommand(this, this.env); }],
      ['emulate', async () => { const { EmulateCommand } = await import('./emulate'); return new EmulateCommand(this, this.env); }],
      ['platform', async () => { const { PlatformCommand } = await import('./platform'); return new PlatformCommand(this, this.env); }],
      ['plugin', async () => { const { PluginCommand } = await import('./plugin'); return new PluginCommand(this, this.env); }],
      ['prepare', async () => { const { PrepareCommand } = await import('./prepare'); return new PrepareCommand(this, this.env); }],
      ['resources', async () => { const { ResourcesCommand } = await import('./resources'); return new ResourcesCommand(this, this.env); }],
      ['run', async () => { const { RunCommand } = await import('./run'); return new RunCommand(this, this.env); }],
      ['requirements', async () => { const { RequirementsCommand } = await import('./requirements'); return new RequirementsCommand(this, this.env); }],
      ['platforms', 'platform'],
      ['plugins', 'plugin'],
    ]);
  }
}
