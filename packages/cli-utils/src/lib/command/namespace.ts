import {
  CommandData,
  ICommand,
  ICommandMap,
  INamespace,
  INamespaceMap
} from '../../definitions';

import { flattenArray } from '../utils/array';

export class CommandMap extends Map<string, () => ICommand> {
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

export class NamespaceMap extends Map<string, () => INamespace> {}

export class Namespace implements INamespace {
  name = '';
  namespaces = new NamespaceMap();
  commands = new CommandMap();

  /**
   * Recursively inspect inputs supplied to walk down all the tree of
   * namespaces available to find the command that we will execute.
   */
  locateCommand(argv: string[]): [string[], ICommand | undefined] {
    function expandColons(inputs: string[]) {
      return flattenArray(inputs.map((arg) => arg.split(':')));
    }

    function ln(inputs: string[], ns: INamespace): [string[], ICommand | undefined] {
      const namespaceMap = ns.namespaces;

      if (!namespaceMap.has(inputs[0])) {
        const commands = ns.commands;
        const cmdgetter = commands.get(inputs[0]);

        if (!cmdgetter) {
          return [argv, undefined];
        }

        return [inputs.slice(1), cmdgetter()];
      }

      const nsgetter = namespaceMap.get(inputs[0]);

      if (!nsgetter) {
        return [argv, undefined];
      }

      return ln(inputs.slice(1), nsgetter());
    }

    return ln(expandColons(argv), this);
  }
}

/**
 * Get all commands for a namespace. Return a flat structure
 */
export function getCommandMetadataList(namespace: INamespace, namespaceDepthList: string[] = []) {
  let commandList: CommandData[] = [];
  const namespaceMap = namespace.namespaces;

  // If this namespace has children then get their commands
  if (namespaceMap.size > 0) {
    namespaceMap.forEach((nsgetter) => {
      const ns = nsgetter();
      const cmds = getCommandMetadataList(ns, [...namespaceDepthList, ns.name]);
      commandList = commandList.concat(cmds);
    });
  }

  /**
   * Gather all commands for a namespace and turn them into simple
   * key value objects. Also keep a record of the namespace path.
   */
  const commands = namespace.commands;
  commands.forEach((cmdgetter) => {
    const cmd = cmdgetter();
    commandList.push(cmd.metadata);
  });

  return commandList;
}
