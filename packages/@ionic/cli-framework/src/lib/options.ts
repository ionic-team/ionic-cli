import * as lodash from 'lodash';
import * as minimist from 'minimist';

import { CommandLineOptions, CommandMetadataOption, HydratedParseArgsOptions, ParsedArg } from '../definitions';

import { Colors, DEFAULT_COLORS } from './colors';

export const parseArgs = minimist;
export { ParsedArgs } from 'minimist';

/**
 * Remove options, which are any arguments that starts with a hyphen (-), from
 * a list of process args and return the result.
 *
 * If a double-hyphen separator (--) is encountered, it and the remaining
 * arguments are included in the result, as they are not interpreted. This
 * behavior can be disabled by setting the `includeSeparated` option to
 * `false`.
 */
export function stripOptions(pargv: readonly string[], { includeSeparated = true }: { includeSeparated?: boolean; }): string[] {
  const r = /^\-/;
  const [ ownArgs, otherArgs ] = separateArgv(pargv);
  const filteredArgs = ownArgs.filter(arg => !r.test(arg));

  if (!includeSeparated) {
    return filteredArgs;
  }

  if (otherArgs.length > 0) {
    otherArgs.unshift('--');
  }

  return [...filteredArgs, ...otherArgs];
}

/**
 * Split a list of process args into own-arguments and other-arguments, which
 * are separated by the double-hyphen (--) separator.
 *
 * For example, `['cmd', 'arg1', '--', 'arg2']` will be split into
 * `['cmd', 'arg1']` and `['arg2']`.
 */
export function separateArgv(pargv: readonly string[]): [string[], string[]] {
  const ownArgs = [...pargv];
  const otherArgs: string[] = [];
  const sepIndex = pargv.indexOf('--');

  if (sepIndex >= 0) {
    otherArgs.push(...ownArgs.splice(sepIndex));
    otherArgs.shift(); // strip separator
  }

  return [ ownArgs, otherArgs ];
}

/**
 * Takes a Minimist command option and normalizes its values.
 */
export function hydrateCommandMetadataOption<O extends CommandMetadataOption>(option: O): O {
  const type = option.type ? option.type : String;

  return lodash.assign({}, option, {
    type,
    default: typeof option.default !== 'undefined' ? option.default : null,
    aliases: Array.isArray(option.aliases) ? option.aliases : [],
  });
}

export interface HydratedOptionSpec {
  readonly value: string;
}

export function hydrateOptionSpec<O extends CommandMetadataOption>(opt: O): HydratedOptionSpec {
  return { ...{ value: opt.type === Boolean ? 'true/false' : opt.name }, ...opt.spec || {} };
}

export interface FormatOptionNameOptions {
  readonly showAliases?: boolean;
  readonly showValueSpec?: boolean;
  readonly colors?: Colors;
}

export function formatOptionName<O extends CommandMetadataOption>(opt: O, { showAliases = true, showValueSpec = true, colors = DEFAULT_COLORS }: FormatOptionNameOptions = {}): string {
  const { input, weak } = colors;
  const spec = hydrateOptionSpec(opt);

  const showInverse = opt.type === Boolean && opt.default === true && opt.name.length > 1;
  const valueSpec = opt.type === Boolean ? '' : `=<${spec.value}>`;
  const aliasValueSpec = opt.type === Boolean ? '' : '=?';

  return (
    (showInverse ? input(`--no-${opt.name}`) : input(`-${opt.name.length > 1 ? '-' : ''}${opt.name}`)) +
    (showValueSpec ? weak(valueSpec) : '') +
    (showAliases ?
      (!showInverse && opt.aliases && opt.aliases.length > 0 ? ', ' + opt.aliases
        .map(alias => input(`-${alias}`) + (showValueSpec ? weak(aliasValueSpec) : ''))
        .join(', ') : '') : '')
  );
}

export function metadataOptionsToParseArgsOptions(commandOptions: readonly CommandMetadataOption[]): HydratedParseArgsOptions {
  const options: HydratedParseArgsOptions = {
    string: ['_'],
    boolean: [],
    alias: {},
    default: {},
    '--': true,
  };

  for (const o of commandOptions) {
    const opt = hydrateCommandMetadataOption(o);

    if (opt.type === String) {
      options.string.push(opt.name);
    } else if (opt.type === Boolean) {
      options.boolean.push(opt.name);
    }

    if (typeof opt.default !== 'undefined') {
      options.default[opt.name] = opt.default;
    }

    if (typeof opt.aliases !== 'undefined') {
      options.alias[opt.name] = opt.aliases;
    }
  }

  return options;
}

export type OptionPredicate<O extends CommandMetadataOption> = (option: O, value?: ParsedArg) => boolean;

export namespace OptionFilters {
  export function includesGroups<O extends CommandMetadataOption>(groups: string | string[]): OptionPredicate<O> {
    const g = Array.isArray(groups) ? groups : [groups];
    return (option: O) => typeof option.groups !== 'undefined' && lodash.intersection(option.groups, g).length > 0;
  }

  export function excludesGroups<O extends CommandMetadataOption>(groups: string | string[]): OptionPredicate<O> {
    const g = Array.isArray(groups) ? groups : [groups];
    return (option: O) => typeof option.groups === 'undefined' || lodash.difference(option.groups, g).length > 0;
  }
}

/**
 * Given an array of command metadata options and an object of parsed options,
 * match each supplied option with its command metadata option definition and
 * pass it, along with its value, to a predicate function, which is used to
 * return a subset of the parsed options.
 *
 * Options which are unknown to the command metadata are always excluded.
 *
 * @param predicate If excluded, `() => true` is used.
 */
export function filterCommandLineOptions<O extends CommandMetadataOption>(options: readonly O[], parsedArgs: CommandLineOptions, predicate: OptionPredicate<O> = () => true): CommandLineOptions {
  const initial: CommandLineOptions = { _: parsedArgs._ };

  if (parsedArgs['--']) {
    initial['--'] = parsedArgs['--'];
  }

  const mapped = new Map([
    ...options.map((o): [string, O] => [o.name, o]),
    ...lodash.flatten(options.map(opt => opt.aliases ? opt.aliases.map((a): [string, O] => [a, opt]) : [])),
  ]);

  const pairs = Object.keys(parsedArgs)
    .map((k): [string, O | undefined, ParsedArg | undefined] => [k, mapped.get(k), parsedArgs[k]])
    .filter(([ k, opt, value ]) => opt && predicate(opt, value))
    .map(([ k, opt, value ]) => [opt ? opt.name : k, value]);

  return { ...initial, ...lodash.fromPairs(pairs) };
}

/**
 * Given an array of command metadata options and an object of parsed options,
 * return a subset of the parsed options whose command metadata option
 * definition contains the supplied group(s).
 *
 * Options which are unknown to the command metadata are always excluded.
 *
 * @param groups One or more option groups.
 */
export function filterCommandLineOptionsByGroup<O extends CommandMetadataOption>(options: readonly O[], parsedArgs: CommandLineOptions, groups: string | string[]): CommandLineOptions {
  return filterCommandLineOptions(options, parsedArgs, OptionFilters.includesGroups(groups));
}

export interface UnparseArgsOptions {
  useDoubleQuotes?: boolean;
  useEquals?: boolean;
  ignoreFalse?: boolean;
  allowCamelCase?: boolean;
}

/**
 * The opposite of `parseArgs()`. This function takes parsed args and converts
 * them back into an argv array of arguments and options.
 *
 * Based on dargs, by sindresorhus
 * @see https://github.com/sindresorhus/dargs/blob/master/license
 *
 * @param parsedArgs Inputs and options parsed by minimist.
 * @param options.useDoubleQuotes For options with values, wrap the value in
 *                                double quotes if it contains a space.
 * @param options.useEquals Instead of separating an option and its value with
 *                          a space, use an equals sign.
 * @param options.ignoreFalse Optionally ignore flags that equate to false.
 * @param options.allowCamelCase Optionally allow camel cased options instead
 *                               of converting to kebab case.
 * @param parseArgsOptions To provide more accuracy, specify the options that
 *                         were used to parse the args in the first place.
 */
export function unparseArgs(parsedArgs: minimist.ParsedArgs, { useDoubleQuotes, useEquals = true, ignoreFalse = true, allowCamelCase }: UnparseArgsOptions = {}, parseArgsOptions?: minimist.Opts): string[] {
  const args = [...parsedArgs['_'] || []];
  const separatedArgs = parsedArgs['--'];

  if (useDoubleQuotes) {
    useEquals = true;
  }

  const dashKey = (k: string) => (k.length === 1 ? '-' : '--') + k;

  const pushPairs = (...pairs: [string, string | undefined][]) => {
    for (const [ k, val ] of pairs) {
      const key = dashKey(allowCamelCase ? k : k.replace(/[A-Z]/g, '-$&').toLowerCase());

      if (useEquals) {
        args.push(key + (val ? `=${useDoubleQuotes && val.includes(' ') ? `"${val}"` : val}` : ''));
      } else {
        args.push(key);

        if (val) {
          args.push(val);
        }
      }
    }
  };

  // Normalize the alias definitions from the options for `parseArgs`.
  const aliasDef: { [key: string]: string[]; } = parseArgsOptions && parseArgsOptions.alias
    ? lodash.mapValues(parseArgsOptions.alias, v => Array.isArray(v) ? v : [v])
    : {};

  // Construct a mapping of alias to original key name.
  const aliases = new Map<string, string>(lodash.flatten(Object.keys(aliasDef).map(k => aliasDef[k].map((a): [string, string] => [a, k]))));

  const isKnown = (key: string) => {
    if (!parseArgsOptions || !parseArgsOptions.unknown) {
      return true;
    }

    if (
      (typeof parseArgsOptions.string !== 'undefined' && (Array.isArray(parseArgsOptions.string) && parseArgsOptions.string.includes(key))) ||
      (typeof parseArgsOptions.boolean !== 'undefined' && (Array.isArray(parseArgsOptions.boolean) && parseArgsOptions.boolean.includes(key))) ||
      aliases.has(key)
    ) {
      return true;
    }

    return parseArgsOptions.unknown(key);
  };

  // Convert the parsed args to an array of 2-tuples of shape [key, value].
  // Then, filter out pairs which match any of the following criteria:
  //  - `_` (positional argument list)
  //  - `--` (separated args)
  //  - Aliases whose original key is defined
  //  - Options not known to the schema, according to
  //    `parseArgsOptions.unknown` option.
  const pairedOptions = lodash.toPairs(parsedArgs).filter(([k]) =>
    k !== '_' &&
    k !== '--' &&
    !(aliases.get(k) && typeof parsedArgs[k] !== 'undefined') &&
    isKnown(k)
  );

  for (const [ key, val ] of pairedOptions) {
    if (val === true) {
      pushPairs([key, undefined]);
    } else if (val === false && !ignoreFalse) {
      pushPairs([`no-${key}`, undefined]);
    } else if (typeof val === 'string') {
      pushPairs([key, val]);
    } else if (typeof val === 'number' && !Number.isNaN(val)) {
      pushPairs([key, val.toString()]);
    } else if (Array.isArray(val)) {
      pushPairs(...val.map((v): [string, string] => [key, v]));
    }
  }

  if (separatedArgs && separatedArgs.length > 0) {
    args.push('--', ...separatedArgs);
  }

  return args;
}
