import * as lodash from 'lodash';

import { strcmp } from '../utils/string';

import {
  CommandInstanceInfo,
  CommandLineInputs,
  CommandLineOptions,
  CommandMapGetter,
  CommandMapKey,
  CommandMetadata,
  CommandMetadataInput,
  CommandMetadataOption,
  CommandPathItem,
  HydratedCommandMetadata,
  ICommand,
  ICommandMap,
  INamespace,
  INamespaceMap,
  NamespaceLocateResult,
  NamespaceMapGetter,
  NamespaceMetadata,
  ValidationError,
} from '../definitions';

import { isCommandMapKey } from '../guards';
import { InputValidationError } from './errors';
import { validate } from './validators';

export abstract class BaseCommand<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> {
  constructor(public namespace: N) {}

  abstract getMetadata(): Promise<M>;

  abstract run(inputs: CommandLineInputs, options: CommandLineOptions, runtime?: CommandInstanceInfo<C, N, M, I, O>): Promise<void>;

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

export class BaseCommandMap<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> extends Map<CommandMapKey, string | CommandMapGetter<C, N, M, I, O>> implements ICommandMap<C, N, M, I, O> {
  getAliases(): Map<CommandMapKey, CommandMapKey[]> {
    const aliasmap = new Map<CommandMapKey, CommandMapKey[]>();

    // TODO: waiting for https://github.com/Microsoft/TypeScript/issues/18562
    const aliases = <[CommandMapKey, CommandMapKey][]>[...this.entries()].filter(([, v]) => isCommandMapKey(v));

    aliases.forEach(([alias, cmd]) => {
      const cmdaliases = aliasmap.get(cmd) || [];
      cmdaliases.push(alias);
      aliasmap.set(cmd, cmdaliases);
    });

    return aliasmap;
  }

  resolveAliases(cmdName: string): undefined | CommandMapGetter<C, N, M, I, O> {
    const r = this.get(cmdName);

    if (typeof r !== 'string') {
      return r;
    }

    return this.resolveAliases(r);
  }
}

export class BaseNamespaceMap<C extends ICommand<C, N, M, I, O>, N extends INamespace<C, N, M, I, O>, M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption> extends Map<string, NamespaceMapGetter<C, N, M, I, O>> implements INamespaceMap<C, N, M, I, O> {}

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
   * Recursively inspect inputs supplied to walk down all the tree of
   * namespaces available to find the command that we will execute or the
   * right-most namespace matched if the command is not found.
   */
  async locate(argv: string[]): Promise<NamespaceLocateResult<C, N, M, I, O>> {
    const _locate = async (inputs: string[], parent: N, path: CommandPathItem<C, N, M, I, O>[]): Promise<NamespaceLocateResult<C, N, M, I, O>> => {
      const [ key ] = inputs;
      const children = await parent.getNamespaces();
      const nsgetter = children.get(key);

      if (!nsgetter) {
        const commands = await parent.getCommands();
        const cmdgetter = commands.resolveAliases(key);

        if (cmdgetter) {
          const cmd = await cmdgetter();
          return { args: inputs.slice(1), obj: cmd, path: [...path, [key, cmd]] };
        }

        const defaultcmdgetter = commands.get(CommandMapDefault);

        if (defaultcmdgetter && typeof defaultcmdgetter !== 'string') { // TODO: string check is gross
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
  async getCommandMetadataList(): Promise<(M & HydratedCommandMetadata<C, N, M, I, O>)[]> {
    const _getCommandMetadataList = async (parent: N, path: CommandPathItem<C, N, M, I, O>[]) => {
      const commandList: (M & HydratedCommandMetadata<C, N, M, I, O>)[] = [];
      const commands = await parent.getCommands();
      const nsAliases = commands.getAliases();

      // Gather all commands for a namespace and turn them into simple key value
      // objects. Also keep a record of the namespace path.
      await Promise.all([...commands.entries()].map(async ([k, cmdgetter]) => {
        if (typeof cmdgetter === 'string') {
          return;
        }

        const command = await cmdgetter();

        const aliases = nsAliases.get(k) || [];
        const metadata = await command.getMetadata();

        const cmdPath = [...path];

        if (typeof k === 'string') {
          cmdPath.push([k, command]);
        }

        // TODO: can't use spread: https://github.com/Microsoft/TypeScript/pull/13288
        const result = lodash.assign({}, metadata, { command, namespace: parent, aliases, path: cmdPath });
        commandList.push(result);
      }));

      commandList.sort((a, b) => strcmp(a.name, b.name));

      let namespacedCommandList: (M & HydratedCommandMetadata<C, N, M, I, O>)[] = [];

      const children = await parent.getNamespaces();

      // If this namespace has children then get their commands
      if (children.size > 0) {
        await Promise.all([...children.entries()].map(async ([k, nsgetter]) => {
          const ns = await nsgetter();
          const cmds = await _getCommandMetadataList(ns, [...path, [k, ns]]);
          namespacedCommandList = namespacedCommandList.concat(cmds);
        }));
      }

      return commandList.concat(namespacedCommandList);
    };

    // TODO: typescript complains about `this`. Calling this method on
    // BaseNamespace would be unsafe if the class weren't abstract. Typescript
    // bug? I may be wrong.
    return _getCommandMetadataList(<any>this, []);
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
