import { CommandMap, Namespace } from '@ionic/cli-utils';

import { ConfigGetCommand } from './get';
import { ConfigSetCommand } from './set';

export class ConfigNamespace extends Namespace {
  name = 'config';
  source = 'ionic';

  commands = new CommandMap([
    ['get', () => new ConfigGetCommand()],
    ['set', () => new ConfigSetCommand()],
  ]);
}
