import { CommandData, ICommand, INamespace } from '../../definitions';
import { flattenArray } from '../utils/array';
import { strcmp } from '../utils/string';

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
   * namespaces available to find the command that we will execute or the
   * right-most namespace matched if the command is not found.
   */
  locate(argv: string[]): [string[], ICommand | INamespace] {
    function expandColons(inputs: string[]) {
      return flattenArray(inputs.map((arg) => arg.split(':')));
    }

    function _locate(inputs: string[], ns: INamespace, namespaceDepthList: string[]): [string[], ICommand | INamespace] {
      if (!ns.namespaces.has(inputs[0])) {
        const commands = ns.commands;
        const cmdgetter = commands.get(inputs[0]);

        if (cmdgetter) {
          const cmd = cmdgetter();
          cmd.metadata.fullName = [...namespaceDepthList.slice(1), cmd.metadata.name].join(' ');
          return [inputs.slice(1), cmd];
        }
      }

      const nsgetter = ns.namespaces.get(inputs[0]);

      if (!nsgetter) {
        return [inputs, ns];
      }

      const newNamespace = nsgetter();
      return _locate(inputs.slice(1), newNamespace, [...namespaceDepthList, newNamespace.name]);
    }

    return _locate(expandColons(argv), this, [this.name]);
  }

  /**
   * Get all command metadata in a flat structure.
   */
  getCommandMetadataList(): CommandData[] {
    function _getCommandMetadataList(namespace: INamespace, namespaceDepthList: string[]) {
      const commandList: CommandData[] = [];

      // Gather all commands for a namespace and turn them into simple key value
      // objects. Also keep a record of the namespace path.
      namespace.commands.forEach((cmdgetter) => {
        const cmd = cmdgetter();
        cmd.metadata.fullName = [...namespaceDepthList.slice(1), cmd.metadata.name].join(' ');
        commandList.push(cmd.metadata);
      });

      commandList.sort((a, b) => strcmp(a.name, b.name));

      let namespacedCommandList: CommandData[] = [];

      // If this namespace has children then get their commands
      if (namespace.namespaces.size > 0) {
        namespace.namespaces.forEach((nsgetter) => {
          const ns = nsgetter();
          const cmds = _getCommandMetadataList(ns, [...namespaceDepthList, ns.name]);
          namespacedCommandList = namespacedCommandList.concat(cmds);
        });
      }

      namespacedCommandList.sort((a, b) => strcmp(a.fullName, b.fullName));

      return commandList.concat(namespacedCommandList);
    }

    return _getCommandMetadataList(this, [this.name]);
  }
}
