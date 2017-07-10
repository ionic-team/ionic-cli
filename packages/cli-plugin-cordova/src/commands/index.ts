import { CommandMap, INamespace, Namespace } from '@ionic/cli-utils';

import { BuildCommand } from './build';
import { CompileCommand } from './compile';
import { EmulateCommand } from './emulate';
import { PlatformCommand } from './platform';
import { PluginCommand } from './plugin';
import { PrepareCommand } from './prepare';
import { ResourcesCommand } from './resources';
import { RunCommand } from './run';

export class CordovaNamespace extends Namespace implements INamespace {
  name = 'cordova';
  commands = new CommandMap([
    ['build', () => new BuildCommand()],
    ['compile', () => new CompileCommand()],
    ['emulate', () => new EmulateCommand()],
    ['platform', () => new PlatformCommand()],
    ['plugin', () => new PluginCommand()],
    ['prepare', () => new PrepareCommand()],
    ['resources', () => new ResourcesCommand()],
    ['run', () => new RunCommand()],
  ]);
}
