import * as dargs from 'dargs';
import * as minimistType from 'minimist';

import {
  CommandData,
  CommandLineInput,
  CommandLineOptions,
  CommandOption,
  CommandOptionType,
  CommandOptionTypeDefaults,
  NormalizedCommandOption,
  NormalizedMinimistOpts,
} from '../../definitions';

const typeDefaults: CommandOptionTypeDefaults = new Map<CommandOptionType, CommandLineInput>()
  .set(String, null)
  .set(Boolean, false);

export interface MinimistOptionsToArrayOptions extends dargs.Opts {
  useDoubleQuotes?: boolean;
}

export function minimistOptionsToArray(options: CommandLineOptions, fnOptions: MinimistOptionsToArrayOptions = {}): string[] {
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
function normalizeOption(option: CommandOption): NormalizedCommandOption {
  if (!option.type) {
    option.type = String;
  }

  if (!option.default) {
    option.default = typeDefaults.get(option.type);
  }

  if (!option.aliases) {
    option.aliases = [];
  }

  return option as NormalizedCommandOption;
}

export function metadataToMinimistOptions(metadata: CommandData): minimistType.Opts {
  let options: NormalizedMinimistOpts = {
    string: ['_'],
    boolean: [],
    alias: {},
    default: {}
  };

  if (!metadata.options) {
    return { boolean: true, string: '_' };
  }

  for (let option of metadata.options.map(o => normalizeOption(o))) {
    if (option.type === String) {
      options.string.push(option.name);
    } else if (option.type === Boolean) {
      options.boolean.push(option.name);
    }

    options.default[option.name] = option.default;
    options.alias[option.name] = option.aliases;
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
 * @param metadata
 * @param options The options to filter.
 * @param indentName
 *
 * @return The filtered options.
 */
export function filterOptionsByIntent(metadata: CommandData, options: CommandLineOptions, intentName?: string): CommandLineOptions {
  const r = Object.keys(options).reduce((allOptions, optionName) => {
    const metadataOptionFound = (metadata.options || []).find((mdOption) => (
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
