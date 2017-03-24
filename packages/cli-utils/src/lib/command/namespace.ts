import {
  CommandData,
  ICommand,
  ICommandMap,
  INamespace,
  INamespaceMap
} from '../../definitions';

export class CommandMap extends Map<string, ICommand> {
  /*
  TODO: find a better way to handle aliases that does not duplicate within help doc list
  set(key: string, value?: ICommand): this {
    if (value && value.metadata && value.metadata.aliases) {
      for (let alias of value.metadata.aliases) {
        super.set(alias, value);
      }
    }

    return super.set(key, value);
  }
  */
}

export class NamespaceMap extends Map<string, INamespace> {}

export class Namespace implements INamespace {

  name = '';

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

/**
 * Get all commands for a namespace. Return a flat structure
 */
export function getCommandMetadataList(namespace: INamespace, namespaceDepthList: string[] = []) {
  let commandList: CommandData[] = [];
  const namespaces = namespace.getNamespaces();

  // If this namespace has children then get their commands
  if (namespaces.size > 0) {
    namespaces.forEach((ns) => {
      const cmds = getCommandMetadataList(ns, [...namespaceDepthList, ns.name]);
      commandList = commandList.concat(cmds);
    });
  }

  /**
   * Gather all commands for a namespace and turn them into simple
   * key value objects. Also keep a record of the namespace path.
   */
  const commands = namespace.getCommands();
  commands.forEach((cmd) => {
    commandList.push(cmd.metadata);
  });

  return commandList;
}
