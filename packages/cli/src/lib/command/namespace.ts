import {
  CommandEnvironment,
  ICommand,
  ICommandMap,
  INamespaceMap
} from '../../definitions';

export class CommandMap extends Map<string, ICommand> {
  set(key: string, value?: ICommand): this {
    if (value && value.metadata && value.metadata.aliases) {
      for (let alias of value.metadata.aliases) {
        super.set(alias, value);
      }
    }

    return super.set(key, value);
  }
}

export class NamespaceMap extends Map<string, INamespace> {}

export class Namespace implements INamespace {
  public name = '';
  constructor(public env: CommandEnvironment) {}

  getNamespaces(): INamespaceMap {
    return new NamespaceMap();
  }

  getCommands(): ICommandMap {
    return new CommandMap();
  }
}

