import {
  CommandData,
  CommandInput,
  CommandOption,
  ICommand,
  INamespace,
  IRootNamespace,
  IonicEnvironment,
} from '../definitions';

import {
  CommandMap as BaseCommandMap,
  Namespace as BaseNamespace,
  NamespaceMap as BaseNamespaceMap,
  RootNamespace as BaseRootNamespace,
} from '@ionic/cli-framework/lib';

export class CommandMap extends BaseCommandMap<ICommand, CommandData, CommandInput, CommandOption> {}
export class NamespaceMap extends BaseNamespaceMap<ICommand, CommandData, CommandInput, CommandOption> {}

export abstract class Namespace extends BaseNamespace<ICommand, CommandData, CommandInput, CommandOption> implements INamespace {}

export abstract class RootNamespace extends BaseRootNamespace<ICommand, CommandData, CommandInput, CommandOption> implements IRootNamespace {
  abstract async runCommand(ienv: IonicEnvironment, pargv: string[], env: { [key: string]: string; }): Promise<void>;
}
