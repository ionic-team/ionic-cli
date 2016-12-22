import {
  ICommand,
  ICommandMap,
  INamespace,
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

  getNamespaces(): INamespaceMap {
    return new NamespaceMap();
  }

  getCommands(): ICommandMap {
    return new CommandMap();
  }

  /**
   * Recursively inspect inputs supplied to walk down all the tree of namespaces
   * available to find the command that we will execute.
   */
  locateCommand(argv: string[]): [string[], ICommand | undefined] {
    return (function ln(inputs: string[], ns: INamespace): [string[], ICommand | undefined] {
      const namespaces = ns.getNamespaces();

      if (!namespaces.has(inputs[0])) {
        const commands = ns.getCommands();
        const command = commands.get(inputs[0]);

        if (!command) {
          return [argv, undefined];
        }

        return [inputs.slice(1), command];
      }

      const nextNamespace = namespaces.get(inputs[0]);

      if (!nextNamespace) {
        return [argv, undefined];
      }

      return this(inputs.slice(1), nextNamespace);
    }(argv, this));
  }
}

