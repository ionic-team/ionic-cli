import * as dargs from 'dargs';
import * as minimist from 'minimist';

import { strcmp } from '../utils/string';

import {
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  CommandMetadataInput,
  CommandMetadataOption,
  CommandOptionType,
  CommandPathItem,
  ICommand,
  ICommandMap,
  ICommandMapGetter,
  ICommandMapKey,
  IHydratedCommandData,
  INamespace,
  INamespaceLocateResult,
  INamespaceMap,
  INamespaceMapGetter,
  INamespaceMetadata,
  NormalizedCommandOption,
  NormalizedParseArgsOptions,
  ParsedArg,
  ValidationError,
} from '../definitions';

import { isCommandMapKey } from '../guards';
import { InputValidationError } from './errors';
import { validate } from './validators';

export const parseArgs = minimist;
export { ParsedArgs } from 'minimist';

export abstract class BaseCommand<T extends INamespace<ICommand<T, U, V, W>, U, V, W>, U extends CommandMetadata<V, W>, V extends CommandMetadataInput, W extends CommandMetadataOption> implements ICommand<T, U, V, W> {
  constructor(public namespace: T) {}

  abstract getMetadata(): Promise<U>;

  abstract run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void>;

  async validate(argv: CommandLineInputs): Promise<void> {
    const flatten = await import('lodash/flatten');
    const metadata = await this.getMetadata();

    if (!metadata.inputs) {
      return;
    }

    const errors: ValidationError[][] = [];

    for (let i in metadata.inputs) {
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
      throw new InputValidationError('Invalid inputs.', flatten(errors));
    }
  }
}

export const CommandMapDefault = Symbol('default');

export class BaseCommandMap<T extends ICommand<INamespace<T, U, V, W>, U, V, W>, U extends CommandMetadata<V, W>, V extends CommandMetadataInput, W extends CommandMetadataOption> extends Map<ICommandMapKey, string | ICommandMapGetter<T, U, V, W>> implements ICommandMap<T, U, V, W> {
  getAliases(): Map<ICommandMapKey, ICommandMapKey[]> {
    const aliasmap = new Map<ICommandMapKey, ICommandMapKey[]>();

    // TODO: waiting for https://github.com/Microsoft/TypeScript/issues/18562
    const aliases = <[ICommandMapKey, ICommandMapKey][]>[...this.entries()].filter(([, v]) => isCommandMapKey(v));

    aliases.forEach(([alias, cmd]) => {
      const cmdaliases = aliasmap.get(cmd) || [];
      cmdaliases.push(alias);
      aliasmap.set(cmd, cmdaliases);
    });

    return aliasmap;
  }

  resolveAliases(cmdName: string): undefined | ICommandMapGetter<T, U, V, W> {
    const r = this.get(cmdName);

    if (typeof r !== 'string') {
      return r;
    }

    return this.resolveAliases(r);
  }
}

export class BaseNamespaceMap<T extends ICommand<INamespace<T, U, V, W>, U, V, W>, U extends CommandMetadata<V, W>, V extends CommandMetadataInput, W extends CommandMetadataOption> extends Map<string, INamespaceMapGetter<T, U, V, W>> implements INamespaceMap<T, U, V, W> {}

export abstract class BaseNamespace<T extends ICommand<INamespace<T, U, V, W>, U, V, W>, U extends CommandMetadata<V, W>, V extends CommandMetadataInput, W extends CommandMetadataOption> implements INamespace<T, U, V, W> {
  constructor(public parent: INamespace<T, U, V, W> | undefined = undefined) {}

  abstract getMetadata(): Promise<INamespaceMetadata>;

  // TODO: https://github.com/Microsoft/TypeScript/issues/9659
  async getNamespaces(): Promise<INamespaceMap<T, U, V, W>> {
    return new BaseNamespaceMap<T, U, V, W>();
  }

  // TODO: https://github.com/Microsoft/TypeScript/issues/9659
  async getCommands(): Promise<ICommandMap<T, U, V, W>> {
    return new BaseCommandMap<T, U, V, W>();
  }

  /**
   * Recursively inspect inputs supplied to walk down all the tree of
   * namespaces available to find the command that we will execute or the
   * right-most namespace matched if the command is not found.
   */
  async locate(argv: string[]): Promise<INamespaceLocateResult<T, U, V, W>> {
    const _locate = async (inputs: string[], parent: INamespace<T, U, V, W>, path: CommandPathItem<T, U, V, W>[]): Promise<INamespaceLocateResult<T, U, V, W>> => {
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

    return _locate(argv, this, []);
  }

  /**
   * Get all command metadata in a flat structure.
   */
  async getCommandMetadataList(): Promise<(U & IHydratedCommandData<T, U, V, W>)[]> {
    const _getCommandMetadataList = async (parent: INamespace<T, U, V, W>, path: CommandPathItem<T, U, V, W>[]) => {
      const assign = await import('lodash/assign');

      const commandList: (U & IHydratedCommandData<T, U, V, W>)[] = [];
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
        const result = assign({}, metadata, { command, namespace: parent, aliases, path: cmdPath });
        commandList.push(result);
      }));

      commandList.sort((a, b) => strcmp(a.name, b.name));

      let namespacedCommandList: (U & IHydratedCommandData<T, U, V, W>)[] = [];

      const children = await parent.getNamespaces();

      // If this namespace has children then get their commands
      if (children.size > 0) {
        await Promise.all([...children.entries()].map(async ([k, nsgetter]) => {
          const ns = await nsgetter();
          const cmds = await _getCommandMetadataList(ns, [...path, [k, ns]]);
          namespacedCommandList = namespacedCommandList.concat(cmds);
        }));
      }

      // TODO?
      // namespacedCommandList.sort((a, b) => strcmp(a.fullName, b.fullName));

      return commandList.concat(namespacedCommandList);
    };

    return _getCommandMetadataList(this, []);
  }
}

export abstract class Command extends BaseCommand<Namespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {}
export abstract class Namespace extends BaseNamespace<Command, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {}
export class CommandMap extends BaseCommandMap<Command, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {}
export class NamespaceMap extends BaseNamespaceMap<Command, CommandMetadata, CommandMetadataInput, CommandMetadataOption> {}

const typeDefaults = new Map<CommandOptionType, ParsedArg>()
  .set(String, null) // tslint:disable-line:no-null-keyword
  .set(Boolean, false);

export interface ParsedArgsToArgvOptions extends dargs.Options {
  useDoubleQuotes?: boolean;
}

export function parsedArgsToArgv(options: CommandLineOptions, fnOptions: ParsedArgsToArgvOptions = {}): string[] {
  if (typeof fnOptions.ignoreFalse === 'undefined') {
    fnOptions.ignoreFalse = true;
  }

  if (fnOptions.useDoubleQuotes) {
    fnOptions.useEquals = true;
  }

  let results = dargs(options, fnOptions);
  results.splice(results.length - options._.length); // take out arguments

  if (fnOptions.useDoubleQuotes) {
    results = results.map(r => r.replace(/^(\-\-[A-Za-z0-9-]+)=(.+\s+.+)$/, '$1="$2"'));
  }

  return results;
}

/**
 * Takes a Minimist command option and normalizes its values.
 */
function normalizeOption(option: CommandMetadataOption): NormalizedCommandOption {
  const type = option.type ? option.type : String;

  return {
    type,
    default: option.default ? option.default : typeDefaults.get(type),
    aliases: option.aliases ? option.aliases : [],
    ...option,
  };
}

export function metadataToParseArgsOptions(metadata: CommandMetadata): NormalizedParseArgsOptions {
  const options: NormalizedParseArgsOptions = {
    string: ['_'],
    boolean: [],
    alias: {},
    default: {},
  };

  if (!metadata.options) {
    return options;
  }

  for (let option of metadata.options) {
    const normalizedOption = normalizeOption(option);

    if (normalizedOption.type === String) {
      options.string.push(normalizedOption.name);
    } else if (normalizedOption.type === Boolean) {
      options.boolean.push(normalizedOption.name);
    }

    options.default[normalizedOption.name] = normalizedOption.default;
    options.alias[normalizedOption.name] = normalizedOption.aliases;
  }

  return options;
}

/**
 * Filter command line options that match a given "intent", which are specified
 * in the command's metadata.
 *
 * To filter options that have no intent specified in the command's metadata,
 * exclude the intentName parameter.
 *
 * @return The filtered options.
 */
export function filterOptionsByIntent(metadata: CommandMetadata, options: CommandLineOptions, intentName?: string): CommandLineOptions {
  const r = Object.keys(options).reduce((allOptions, optionName) => {
    const metadataOptionFound = (metadata.options || []).find(mdOption => (
      mdOption.name === optionName || (mdOption.aliases || []).includes(optionName)
    ));
    if (metadataOptionFound) {
      if (intentName && metadataOptionFound.intents && metadataOptionFound.intents.includes(intentName)) {
        allOptions[optionName] = options[optionName];
      } else if (!intentName && !metadataOptionFound.intents) {
        allOptions[optionName] = options[optionName];
      }
    }
    return allOptions;
  }, <CommandLineOptions>{});

  r._ = options._;

  if (options['--']) {
    r['--'] = options['--'];
  }

  return r;
}

export async function generateCommandPath<T extends ICommand<INamespace<T, U, V, W>, U, V, W>, U extends CommandMetadata<V, W>, V extends CommandMetadataInput, W extends CommandMetadataOption>(cmd: T): Promise<CommandPathItem<T, U, V, W>[]> {
  const ns = cmd.namespace;
  const cmdmeta = await cmd.getMetadata();

  const _cmdpath = async (namespace: INamespace<T, U, V, W>): Promise<CommandPathItem<T, U, V, W>[]> => {
    const nsmeta = await namespace.getMetadata();
    const nspath: CommandPathItem<T, U, V, W> = [nsmeta.name, namespace];

    if (!namespace.parent) {
      return [nspath];
    }

    return [...(await _cmdpath(namespace.parent)), nspath];
  };

  return [...(await _cmdpath(ns)), [cmdmeta.name, cmd]];
}
