import { ICommandMap, Namespace, CommandMap } from '@ionic/cli';

import { BuildCommand } from './commands/build';
import { CompileCommand } from './commands/compile';
import { EmulateCommand } from './commands/emulate';
import { PlatformCommand } from './commands/platform';
import { PrepareCommand } from './commands/prepare';
import { RunCommand } from './commands/run';

export default class CordovaNamespace extends Namespace {
  getCommands(): ICommandMap {
    let m = new CommandMap();

    m.set('build', new BuildCommand());
    m.set('compile', new CompileCommand());
    m.set('emulate', new EmulateCommand());
    m.set('platform', new PlatformCommand());
    m.set('prepare', new PrepareCommand());
    m.set('run', new RunCommand());

    return m;
  }
}
