import { strong } from '../../lib/color';
import { CommandMap, Namespace } from '../../lib/namespace';

export class CordovaNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'cordova',
      summary: 'Cordova functionality',
      description: `
These commands integrate with Apache Cordova, which brings native functionality to your app.

Cordova Reference documentation:
- Overview: ${strong('https://cordova.apache.org/docs/en/latest/guide/overview/index.html')}
- CLI documentation: ${strong('https://cordova.apache.org/docs/en/latest/reference/cordova-cli/')}
      `,
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['build', async () => { const { BuildCommand } = await import('./build'); return new BuildCommand(this); }],
      ['compile', async () => { const { CompileCommand } = await import('./compile'); return new CompileCommand(this); }],
      ['emulate', async () => { const { EmulateCommand } = await import('./emulate'); return new EmulateCommand(this); }],
      ['platform', async () => { const { PlatformCommand } = await import('./platform'); return new PlatformCommand(this); }],
      ['plugin', async () => { const { PluginCommand } = await import('./plugin'); return new PluginCommand(this); }],
      ['prepare', async () => { const { PrepareCommand } = await import('./prepare'); return new PrepareCommand(this); }],
      ['resources', async () => { const { ResourcesCommand } = await import('./resources'); return new ResourcesCommand(this); }],
      ['run', async () => { const { RunCommand } = await import('./run'); return new RunCommand(this); }],
      ['requirements', async () => { const { RequirementsCommand } = await import('./requirements'); return new RequirementsCommand(this); }],
      ['platforms', 'platform'],
      ['plugins', 'plugin'],
    ]);
  }
}
