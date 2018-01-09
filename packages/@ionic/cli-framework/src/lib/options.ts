import * as dargs from 'dargs';
import * as minimist from 'minimist';
import * as lodash from 'lodash';

import {
  CommandLineOptions,
  CommandMetadata,
  CommandMetadataInput,
  CommandMetadataOption,
  CommandOptionType,
  HydratedCommandOption,
  HydratedParseArgsOptions,
  MetadataGroup,
  ParsedArg,
} from '../definitions';

export const parseArgs = minimist;
export { ParsedArgs } from 'minimist';

/**
 * Remove options, which are any arguments that starts with a hyphen (-), from
 * a list of process args and return the result.
 *
 * If a double-hyphen separator (--) is encountered, it and the remaining
 * arguments are included in the result, as they are not interpreted.
 */
export function stripOptions(pargv: string[]): string[] {
  const [ ownArgs, otherArgs ] = separateArgv(pargv);
  const r = /^\-/;

  if (otherArgs.length > 0) {
    otherArgs.unshift('--');
  }

  return [...ownArgs.filter(arg => !r.test(arg)), ...otherArgs];
}

/**
 * Split a list of process args into own-arguments and other-arguments, which
 * are separated by the double-hyphen (--) separator.
 *
 * For example, `['cmd', 'arg1', '--', 'arg2']` will be split into
 * `['cmd', 'arg1']` and `['arg2']`.
 */
export function separateArgv(pargv: string[]): [string[], string[]] {
  const ownArgs = [...pargv];
  const otherArgs: string[] = [];
  const sepIndex = pargv.indexOf('--');

  if (sepIndex >= 0) {
    otherArgs.push(...ownArgs.splice(sepIndex));
    otherArgs.shift(); // strip separator
  }

  return [ ownArgs, otherArgs ];
}

const typeDefaults = new Map<CommandOptionType, ParsedArg>()
  .set(String, null) // tslint:disable-line:no-null-keyword
  .set(Boolean, false);

/**
 * Takes a Minimist command option and normalizes its values.
 */
export function hydrateCommandMetadataOption<O extends CommandMetadataOption>(option: O): O & HydratedCommandOption {
  const type = option.type ? option.type : String;

  return lodash.assign({}, option, {
    type,
    default: option.default ? option.default : typeDefaults.get(type),
    aliases: option.aliases ? option.aliases : [],
  });
}

export function metadataToParseArgsOptions(metadata: CommandMetadata): HydratedParseArgsOptions {
  const options: HydratedParseArgsOptions = {
    string: ['_'],
    boolean: [],
    alias: {},
    default: {},
  };

  if (!metadata.options) {
    return options;
  }

  for (let o of metadata.options) {
    const opt = hydrateCommandMetadataOption(o);

    if (opt.type === String) {
      options.string.push(opt.name);
    } else if (opt.type === Boolean) {
      options.boolean.push(opt.name);
    }

    options.default[opt.name] = opt.default;
    options.alias[opt.name] = opt.aliases;
  }

  return options;
}

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

export type OptionPredicate<O extends CommandMetadataOption> = (option: O, value?: ParsedArg) => boolean;

export namespace OptionFilters {
  export function includesGroups<O extends CommandMetadataOption>(groups: MetadataGroup | MetadataGroup[]): OptionPredicate<O> {
    const g = Array.isArray(groups) ? groups : [groups];
    return (option: O) => typeof option.groups !== 'undefined' && lodash.intersection(option.groups, g).length > 0;
  }

  export function excludesGroups<O extends CommandMetadataOption>(groups: MetadataGroup | MetadataGroup[]): OptionPredicate<O> {
    const g = Array.isArray(groups) ? groups : [groups];
    return (option: O) => typeof option.groups === 'undefined' || lodash.difference(option.groups, g).length > 0;
  }
}

/**
 * Given a command metadata object and an object of parsed options, match each
 * supplied option with its command metadata option definition and pass it,
 * along with its value, to a predicate function, which is used to return a
 * subset of the parsed options.
 *
 * Options which are unknown to the command metadata are always excluded.
 *
 * @param predicate If excluded, `() => true` is used.
 */
export function filterCommandLineOptions<M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption>(metadata: M, parsedArgs: CommandLineOptions, predicate: OptionPredicate<O> = () => true): CommandLineOptions {
  const initial: CommandLineOptions = { _: parsedArgs._ };

  if (parsedArgs['--']) {
    initial['--'] = parsedArgs['--'];
  }

  const mapped = new Map(metadata.options ? [
    ...metadata.options.map((o): [string, O] => [o.name, o]),
    ...lodash.flatten(metadata.options.map(opt => opt.aliases ? opt.aliases.map((a): [string, O] => [a, opt]) : [])),
  ] : []);

  const pairs = Object.keys(parsedArgs)
    .map((k): [string, O | undefined, ParsedArg | undefined] => [k, mapped.get(k), parsedArgs[k]])
    .filter(([ k, opt, value ]) => opt && predicate(opt, value))
    .map(([ k, opt, value ]) => [opt ? opt.name : k, value]);

  return { ...initial, ...lodash.fromPairs(pairs) };
}

/**
 * Given a command metadata object and an object of parsed options, return a
 * subset of the parsed options whose command metadata option definition
 * contains the supplied group(s).
 *
 * Options which are unknown to the command metadata are always excluded.
 *
 * @param groups One or more option groups.
 */
export function filterCommandLineOptionsByGroup<M extends CommandMetadata<I, O>, I extends CommandMetadataInput, O extends CommandMetadataOption>(metadata: M, parsedArgs: CommandLineOptions, groups: MetadataGroup | MetadataGroup[]): CommandLineOptions {
  return filterCommandLineOptions(metadata, parsedArgs, OptionFilters.includesGroups(groups));
}
