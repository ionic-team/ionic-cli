import * as lodash from 'lodash';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMapGetter, CommandMetadata, CommandMetadataInput, CommandMetadataOption, CommandPathItem, HydratedCommandMetadata, HydratedNamespaceMetadata, ICommand, ICommandMap, INamespace, INamespaceMap, NamespaceLocateResult, NamespaceMapGetter, NamespaceMetadata, ValidationError } from '../definitions';
import { InputValidationError } from '../errors';
import { strcmp } from '../utils/string';
import { AliasedMap } from '../utils/object';
import { validate } from './validators';

export abstract class BaseCommand<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  constructor(public namespace: N) {}

  abstract getMetadata(): Promise<M>;

  abstract run(inputs: CommandLineInputs, options: CommandLineOptions, runtime?: Partial<CommandInstanceInfo<C, N, M, I, O>>): Promise<void>;

  async validate(argv: CommandLineInputs): Promise<void> {
    const metadata = await this.getMetadata();

    if (!metadata.inputs) {
      return;
    }

    const errors: ValidationError[][] = [];

    for (const i in metadata.inputs) {
      const input = metadata.inputs[i];

      if (input.validators && input.validators.length > 0) {
        try {
          validate(argv[i], input.name, [...input.validators]);
        } catch (e) {
          if (!(e instanceof InputValidationError)) {
            throw e;
          }

          errors.push(e.errors);
        }
      }
    }

    if (errors.length > 0) {
      throw new InputValidationError('Invalid inputs.', lodash.flatten(errors));
    }
  }
}

export const CommandMapDefault = Symbol('default');

export class BaseCommandMap<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> extends AliasedMap<string, CommandMapGetter<C, N, M, I, O>> implements ICommandMap<C, N, M, I, O> {}
export class BaseNamespaceMap<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> extends AliasedMap<string, NamespaceMapGetter<C, N, M, I, O>> implements INamespaceMap<C, N, M, I, O> {}

export abstract class BaseNamespace<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> implements INamespace<C, N, M, I, O> {
  constructor(public parent: N | undefined = undefined) {}

  abstract getMetadata(): Promise<NamespaceMetadata>;

  // TODO: https://github.com/Microsoft/TypeScript/issues/9659
  async getNamespaces(): Promise<INamespaceMap<C, N, M, I, O>> {
    return new BaseNamespaceMap<C, N, M, I, O>();
  }

  // TODO: https://github.com/Microsoft/TypeScript/issues/9659
  async getCommands(): Promise<ICommandMap<C, N, M, I, O>> {
    return new BaseCommandMap<C, N, M, I, O>();
  }

  /**
   * Locate commands and namespaces given a set of inputs.
   *
   * Recursively walk down the tree of namespaces available within this
   * namespace to find the command that we will execute or the right-most
   * namespace matched if the command is not found.
   *
   * The resolved object looks like this:
   *
   *    {
   *      obj: command or namespace,
   *      args: the leftover arguments,
   *      path: the path taken to get to the result which comprises tuples of <arg, command or namespace>
   *    }
   *
   * @param argv The set of command-line arguments to use to locate.
   */
  async locate(argv: string[]): Promise<NamespaceLocateResult<C, N, M, I, O>> {
    const _locate = async (inputs: string[], parent: N, path: CommandPathItem<C, N, M, I, O>[]): Promise<NamespaceLocateResult<C, N, M, I, O>> => {
      const [ key ] = inputs;
      const children = await parent.getNamespaces();
      const nsgetter = children.resolveAliases(key);

      if (!nsgetter) {
        const commands = await parent.getCommands();
        const cmdgetter = commands.resolveAliases(key);

        if (cmdgetter) {
          const cmd = await cmdgetter();
          return { args: inputs.slice(1), obj: cmd, path: [...path, [key, cmd]] };
        }

        const defaultcmdgetter = commands.get(CommandMapDefault);

        if (defaultcmdgetter && typeof defaultcmdgetter !== 'string' && typeof defaultcmdgetter !== 'symbol') {
          const cmd = await defaultcmdgetter();

          if (path.length > 0) {
            // The default command was found via the namespace, so we replace the
            // previous path entry (the namespace which contains this default
            // command) with the command itself.
            path[path.length - 1][1] = cmd;
          }

          return { args: inputs, obj: cmd, path };
        }

        return { args: inputs, obj: parent, path };
      }

      const child = await nsgetter();
      return _locate(inputs.slice(1), child, [...path, [key, child]]);
    };

    const metadata = await this.getMetadata();

    // TODO: typescript complains about `this`. Calling this method on
    // BaseNamespace would be unsafe if the class weren't abstract. Typescript
    // bug? I may be wrong.
    return _locate(argv, <any>this, [[metadata.name, <any>this]]);
  }

  /**
   * Get all command metadata in a flat structure.
   */
  async getCommandMetadataList(): Promise<ReadonlyArray<HydratedCommandMetadata<C, N, M, I, O>>> {
    const _getCommandMetadataList = async (parent: N, path: CommandPathItem<C, N, M, I, O>[]): Promise<HydratedCommandMetadata<C, N, M, I, O>[]> => {
      const commandsInNamespace = await parent.getCommands();
      const commandAliasesInNamespace = commandsInNamespace.getAliases();
      const commandList: HydratedCommandMetadata<C, N, M, I, O>[] = [];

      // Gather all commands for a namespace and turn them into simple key value
      // objects. Also keep a record of the namespace path.
      await Promise.all([...commandsInNamespace.entries()].map(async ([k, cmdgetter]) => {
        if (typeof cmdgetter === 'string' || typeof cmdgetter === 'symbol') {
          return;
        }

        const command = await cmdgetter();
        const commandAliases = (commandAliasesInNamespace.get(k) || []).filter((a): a is string => typeof a === 'string').map(a => [...path.map(([p]) => p), a].join(' '));
        const commandMetadata = await command.getMetadata();
        const commandPath = [...path];

        if (typeof k === 'string') {
          commandPath.push([k, command]);
        }

        // TODO: can't use spread: https://github.com/Microsoft/TypeScript/pull/13288
        const result = lodash.assign({}, commandMetadata, { command, namespace: parent, aliases: commandAliases, path: commandPath });
        commandList.push(result);
      }));

      commandList.sort((a, b) => strcmp(a.name, b.name));

      const children = await parent.getNamespaces();
      const namespacedCommandList: HydratedCommandMetadata<C, N, M, I, O>[] = [];

      // If this namespace has children then get their commands
      if (children.size > 0) {
        await Promise.all([...children.entries()].map(async ([k, nsgetter]) => {
          if (typeof nsgetter === 'string' || typeof nsgetter === 'symbol') {
            return;
          }

          const ns = await nsgetter();
          const commandPath = [...path];

          if (typeof k === 'string') {
            commandPath.push([k, ns]);
          }

          const cmds = await _getCommandMetadataList(ns, commandPath);
          namespacedCommandList.push(...cmds);
        }));
      }

      return [...commandList, ...namespacedCommandList];
    };

    const metadata = await this.getMetadata();

    // TODO: typescript complains about `this`. Calling this method on
    // BaseNamespace would be unsafe if the class weren't abstract. Typescript
    // bug? I may be wrong.
    return _getCommandMetadataList(<any>this, [[metadata.name, <any>this]]);
  }

  async groupCommandsByNamespace(commands: ReadonlyArray<HydratedCommandMetadata<C, N, M, I, O>>): Promise<ReadonlyArray<HydratedNamespaceMetadata<C, N, M, I, O> & { commands: ReadonlyArray<HydratedCommandMetadata<C, N, M, I, O>>; }>> {
    const summaries = new Map<string, string>();
    const grouped = new Map<string, HydratedNamespaceMetadata<C, N, M, I, O> & { commands: HydratedCommandMetadata<C, N, M, I, O>[]; }>();

    await Promise.all(commands.map(async cmd => {
      const nsmeta = await cmd.namespace.getMetadata();
      const aliases: string[] = [];

      if (cmd.namespace.parent) {
        const siblings = await cmd.namespace.parent.getNamespaces();
        aliases.push(...(siblings.getAliases().get(nsmeta.name) || []).filter((a): a is string => typeof a === 'string'));
      }

      summaries.set(nsmeta.name, nsmeta.summary);
      let entry = grouped.get(nsmeta.name);

      if (!entry) {
        entry = {
          namespace: cmd.namespace,
          commands: [],
          aliases,
          ...nsmeta,
          description: nsmeta.description ? nsmeta.description : '',
          groups: nsmeta.groups ? nsmeta.groups : [],
        };
        grouped.set(nsmeta.name, entry);
      }

      entry.commands.push(cmd);
    }));

    return [...grouped.values()];
  }
}

export abstract class Command extends BaseCommand<Command, Namespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {}
export abstract class Namespace extends BaseNamespace<Command, Namespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {}
export class CommandMap extends BaseCommandMap<Command, Namespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {}
export class NamespaceMap extends BaseNamespaceMap<Command, Namespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {}

/**
 * Given a command object, backtrack through the command's namespace to compile
 * a list of command path items which represents how the command was
 * found/constructed.
 */
export async function generateCommandPath<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption>(cmd: C): Promise<CommandPathItem<C, N, M, I, O>[]> {
  const ns = cmd.namespace;
  const cmdmeta = await cmd.getMetadata();

  const _cmdpath = async (namespace: N): Promise<CommandPathItem<C, N, M, I, O>[]> => {
    const nsmeta = await namespace.getMetadata();
    const nspath: CommandPathItem<C, N, M, I, O> = [nsmeta.name, namespace];

    if (!namespace.parent) {
      return [nspath];
    }

    return [...(await _cmdpath(namespace.parent)), nspath];
  };

  return [...(await _cmdpath(ns)), [cmdmeta.name, cmd]];
}
