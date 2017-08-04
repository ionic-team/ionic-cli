import { CommandMap, Namespace } from '@ionic/cli-utils/lib/namespace';

export class CordovaNamespace extends Namespace {
  name = 'cordova';
  description = 'Cordova functionality';

  commands = new CommandMap([
    ['build', async () => { const { BuildCommand } = await import('./build'); return new BuildCommand(); }],
    ['compile', async () => { const { CompileCommand } = await import('./compile'); return new CompileCommand(); }],
    ['emulate', async () => { const { EmulateCommand } = await import('./emulate'); return new EmulateCommand(); }],
    ['platform', async () => { const { PlatformCommand } = await import('./platform'); return new PlatformCommand(); }],
    ['plugin', async () => { const { PluginCommand } = await import('./plugin'); return new PluginCommand(); }],
    ['prepare', async () => { const { PrepareCommand } = await import('./prepare'); return new PrepareCommand(); }],
    ['resources', async () => { const { ResourcesCommand } = await import('./resources'); return new ResourcesCommand(); }],
    ['run', async () => { const { RunCommand } = await import('./run'); return new RunCommand(); }],
  ]);
}
