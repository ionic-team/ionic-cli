import {
  CommandData,
  CommandInput,
  CommandOption,
  ICommand,
  INamespace,
} from '../definitions';

import {
  CommandMap as BaseCommandMap,
  Namespace as BaseNamespace,
  NamespaceMap as BaseNamespaceMap,
} from '@ionic/cli-framework/lib';

export class CommandMap extends BaseCommandMap<ICommand, CommandData, CommandInput, CommandOption> {}
export class NamespaceMap extends BaseNamespaceMap<ICommand, CommandData, CommandInput, CommandOption> {}
export class Namespace extends BaseNamespace<ICommand, CommandData, CommandInput, CommandOption> implements INamespace {}
