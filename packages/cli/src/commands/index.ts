import { ICommandMap, Namespace, CommandMap, HelpCommand } from '@ionic/cli-utils';

import { InfoCommand } from './info';
import { LoginCommand } from './login';
import { StartCommand } from './start';
import { VersionCommand } from './version';

export class IonicNamespace extends Namespace {
  static getCommandNames() {
    return new Set([
      'help',
      'info',
      'login',
      'start',
      'version'
    ]);
  }

  getCommands(): ICommandMap {
    let m = new CommandMap();

    m.set('help', new HelpCommand());
    m.set('info', new InfoCommand());
    m.set('login', new LoginCommand());
    m.set('start', new StartCommand());
    m.set('version', new VersionCommand());

    return m;
  }
}
