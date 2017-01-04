import { ICommandMap, INamespace, Namespace, CommandMap } from '@ionic/cli-utils';

import { BuildCommand } from './build';
import { CompileCommand } from './compile';
import { EmulateCommand } from './emulate';
import { PlatformCommand } from './platform';
import { PrepareCommand } from './prepare';
import { ResourcesCommand } from './resources';
import { RunCommand } from './run';

export class CordovaNamespace extends Namespace implements INamespace {
  getCommands(): ICommandMap {
    let m = new CommandMap();

    m.set('build', new BuildCommand());
    m.set('compile', new CompileCommand());
    m.set('emulate', new EmulateCommand());
    m.set('platform', new PlatformCommand());
    m.set('prepare', new PrepareCommand());
    m.set('resources', new ResourcesCommand());
    m.set('run', new RunCommand());

    return m;
  }
}
