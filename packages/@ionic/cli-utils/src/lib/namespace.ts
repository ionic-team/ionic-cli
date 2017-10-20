import {
  CommandMapGetter,
  HydratedCommandData,
  ICommand,
  INamespace,
  NamespaceMapGetter,
} from '../definitions';

import { strcmp } from '@ionic/cli-framework/utils/string';

export class CommandMap extends Map<string, string | CommandMapGetter> {
  getAliases(): Map<string, string[]> {
    const cmdAliases = new Map<string, string[]>();
    const cmdMapContents: ReadonlyArray<[string, string | CommandMapGetter]> = Array.from(this.entries());
    const aliasToCmd = <ReadonlyArray<[string, string]>>cmdMapContents.filter((value): value is [string, string] => typeof value[1] === 'string'); // TODO: typescript bug?
    aliasToCmd.forEach(([alias, cmd]) => {
      const aliases = cmdAliases.get(cmd) || [];
      aliases.push(alias);
      cmdAliases.set(cmd, aliases);
    });

    return cmdAliases;
  }

  resolveAliases(cmdName: string): undefined | CommandMapGetter {
    const r = this.get(cmdName);

    if (typeof r !== 'string') {
      return r;
    }

    return this.resolveAliases(r);
  }
}

export class NamespaceMap extends Map<string, NamespaceMapGetter> {}

export class Namespace implements INamespace {
  root = false;
  name = '';
  description = '';
  longDescription = '';

  namespaces = new NamespaceMap();
  commands = new CommandMap();

  /**
   * Recursively inspect inputs supplied to walk down all the tree of
   * namespaces available to find the command that we will execute or the
   * right-most namespace matched if the command is not found.
   */
  async locate(argv: string[]): Promise<[number, string[], ICommand | INamespace]> {
    const _locate = async (depth: number, inputs: string[], ns: INamespace, namespaceDepthList: string[]): Promise<[number, string[], ICommand | INamespace]> => {
      const nsgetter = ns.namespaces.get(inputs[0]);
      if (!nsgetter) {
        const commands = ns.commands;
        const cmdgetter = commands.resolveAliases(inputs[0]);

        if (cmdgetter) {
          const cmd = await cmdgetter();
          cmd.metadata.fullName = [...namespaceDepthList.slice(1), cmd.metadata.name].join(' ');
          return [depth + 1, inputs.slice(1), cmd];
        }

        return [depth, inputs, ns];
      }

      const newNamespace = await nsgetter();
      return _locate(depth + 1, inputs.slice(1), newNamespace, [...namespaceDepthList, newNamespace.name]);
    };

    return _locate(0, argv, this, [this.name]);
  }

  /**
   * Get all command metadata in a flat structure.
   */
  async getCommandMetadataList(): Promise<HydratedCommandData[]> {
    const _getCommandMetadataList = async (namespace: INamespace, namespaceDepthList: string[]) => {
      const commandList: HydratedCommandData[] = [];
      const nsAliases = namespace.commands.getAliases();

      // Gather all commands for a namespace and turn them into simple key value
      // objects. Also keep a record of the namespace path.
      await Promise.all([...namespace.commands.values()].map(async (cmdgetter) => {
        if (typeof cmdgetter === 'string') {
          return;
        }

        const cmd = await cmdgetter();
        const fullName = [...namespaceDepthList.slice(1), cmd.metadata.name].join(' ');
        const aliases = nsAliases.get(cmd.metadata.name) || [];
        cmd.metadata.aliases = aliases;
        commandList.push({ namespace, fullName, aliases, ...cmd.metadata });
      }));

      commandList.sort((a, b) => strcmp(a.name, b.name));

      let namespacedCommandList: HydratedCommandData[] = [];

      // If this namespace has children then get their commands
      if (namespace.namespaces.size > 0) {
        await Promise.all([...namespace.namespaces.values()].map(async (nsgetter) => {
          const ns = await nsgetter();
          const cmds = await _getCommandMetadataList(ns, [...namespaceDepthList, ns.name]);
          namespacedCommandList = namespacedCommandList.concat(cmds);
        }));
      }

      namespacedCommandList.sort((a, b) => strcmp(a.fullName, b.fullName));

      return commandList.concat(namespacedCommandList);
    };

    return _getCommandMetadataList(this, [this.name]);
  }
}
