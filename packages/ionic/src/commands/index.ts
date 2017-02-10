import { ICommandMap, Namespace, CommandMap } from '@ionic/cli-utils';

import { InfoCommand } from './info';
import { LoginCommand } from './login';
import { SignupCommand } from './signup';
import { StartCommand } from './start';
import { VersionCommand } from './version';
import { HelpCommand } from './help';

export class IonicNamespace extends Namespace {
  name: 'global';

  getCommands(): ICommandMap {
    let m = new CommandMap();

    m.set('start', new StartCommand());
    m.set('help', new HelpCommand());
    m.set('info', new InfoCommand());
    m.set('login', new LoginCommand());
    m.set('signup', new SignupCommand());
    m.set('version', new VersionCommand());

    return m;
  }
}
