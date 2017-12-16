import * as Debug from 'debug';

const debug = Debug('ionic:cli-framework:lib');

import { CommandData, CommandInput, CommandOption, NamespaceData } from '../definitions';

import { Command } from './command';
import { strcmp } from '../utils/string';

export type HydratedCommandData<T extends Command<U>, U extends CommandData<V, W>, V extends CommandInput, W extends CommandOption> = U & {
  namespace: Namespace<T, U, V, W>;
  aliases: string[];
  fullName: string;
};

export type NamespaceMapGetter<T extends Command<U>, U extends CommandData<V, W>, V extends CommandInput, W extends CommandOption> = () => Promise<Namespace<T, U, V, W>>;
export type CommandMapGetter<T extends Command<U>, U extends CommandData<V, W>, V extends CommandInput, W extends CommandOption> = () => Promise<T>;

export const CommandMapDefault = Symbol('default');

export class CommandMap<T extends Command<U>, U extends CommandData<V, W>, V extends CommandInput, W extends CommandOption> extends Map<string | symbol, string | CommandMapGetter<T, U, V, W>> {
  getAliases(): Map<string, string[]> {
    const aliasmap = new Map<string, string[]>();
    const contents = Array.from(this.entries());
    const aliases = <[string, string][]>contents.filter(([, v]) => typeof v === 'string'); // TODO: typescript bug?

    aliases.forEach(([alias, cmd]) => {
      const cmdaliases = aliasmap.get(cmd) || [];
      cmdaliases.push(alias);
      aliasmap.set(cmd, cmdaliases);
    });

    return aliasmap;
  }

  resolveAliases(cmdName: string): undefined | CommandMapGetter<T, U, V, W> {
    const r = this.get(cmdName);

    if (typeof r !== 'string') {
      return r;
    }

    return this.resolveAliases(r);
  }
}

export class NamespaceMap<T extends Command<U>, U extends CommandData<V, W>, V extends CommandInput, W extends CommandOption> extends Map<string, NamespaceMapGetter<T, U, V, W>> {}

export abstract class Namespace<T extends Command<U>, U extends CommandData<V, W>, V extends CommandInput, W extends CommandOption> {
  // TODO: better way to do this
  root = false;

  abstract readonly metadata: NamespaceData;

  namespaces = new NamespaceMap<T, U, V, W>();
  commands = new CommandMap<T, U, V, W>();

  /**
   * Recursively inspect inputs supplied to walk down all the tree of
   * namespaces available to find the command that we will execute or the
   * right-most namespace matched if the command is not found.
   */
  async locate(argv: string[]): Promise<[number, string[], T | Namespace<T, U, V, W>]> {
    const extractcmd = async (getter: CommandMapGetter<T, U, V, W>, inputs: string[], depth: number, namespaceDepthList: string[]): Promise<[number, string[], T]> => {
      const cmd = await getter();
      cmd.metadata.fullName = [...namespaceDepthList.slice(1), cmd.metadata.name].join(' ');

      debug('command %s found at depth %d', cmd.metadata.name, depth + 1);
      return [depth + 1, inputs.slice(1), cmd];
    };

    const _locate = async (depth: number, inputs: string[], ns: Namespace<T, U, V, W>, namespaceDepthList: string[]): Promise<[number, string[], T | Namespace<T, U, V, W>]> => {
      const nsgetter = ns.namespaces.get(inputs[0]);

      if (!nsgetter) {
        const commands = ns.commands;
        const cmdgetter = commands.resolveAliases(inputs[0]);

        if (cmdgetter) {
          return await extractcmd(cmdgetter, inputs, depth, namespaceDepthList);
        }

        const defaultcmdgetter = commands.get(CommandMapDefault);

        if (defaultcmdgetter && typeof defaultcmdgetter !== 'string') { // TODO: string check is gross
          return await extractcmd(defaultcmdgetter, inputs, depth, namespaceDepthList);
        }

        debug('no command/namespace found at depth %d, using namespace %s', depth + 1, ns.metadata.name);
        return [depth, inputs, ns];
      }

      const newNamespace = await nsgetter();
      debug('namespace %s found at depth %d, slicing and recursing into namespace', newNamespace.metadata.name, depth + 1);
      return _locate(depth + 1, inputs.slice(1), newNamespace, [...namespaceDepthList, newNamespace.metadata.name]);
    };

    return _locate(0, argv, this, [this.metadata.name]);
  }

  /**
   * Get all command metadata in a flat structure.
   */
  async getCommandMetadataList(): Promise<HydratedCommandData<T, U, V, W>[]> {
    const assign = await import('lodash/assign');

    const _getCommandMetadataList = async (namespace: Namespace<T, U, V, W>, namespaceDepthList: string[]) => {
      const commandList: HydratedCommandData<T, U, V, W>[] = [];
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

        // TODO: can't use spread: https://github.com/Microsoft/TypeScript/pull/13288
        const result = assign(cmd.metadata, { namespace, aliases, fullName });
        commandList.push(result);
      }));

      commandList.sort((a, b) => strcmp(a.name, b.name));

      let namespacedCommandList: HydratedCommandData<T, U, V, W>[] = [];

      // If this namespace has children then get their commands
      if (namespace.namespaces.size > 0) {
        await Promise.all([...namespace.namespaces.values()].map(async (nsgetter) => {
          const ns = await nsgetter();
          const cmds = await _getCommandMetadataList(ns, [...namespaceDepthList, ns.metadata.name]);
          namespacedCommandList = namespacedCommandList.concat(cmds);
        }));
      }

      namespacedCommandList.sort((a, b) => strcmp(a.fullName, b.fullName));

      return commandList.concat(namespacedCommandList);
    };

    return _getCommandMetadataList(this, [this.metadata.name]);
  }
}

export abstract class RootNamespace<T extends Command<U>, U extends CommandData<V, W>, V extends CommandInput, W extends CommandOption> extends Namespace<T, U, V, W> {
  root = true;
}
