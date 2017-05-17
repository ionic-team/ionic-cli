import * as chalk from 'chalk';

import * as inquirerType from 'inquirer';
import { Opts as MinimistOpts } from 'minimist';

import {
  CommandData,
  CommandOption,
  CommandLineInput,
  CommandLineOptions,
  CommandOptionType,
  CommandOptionTypeDefaults,
  IonicEnvironment,
  NormalizedCommandOption,
  Validator,
  ValidationError
} from '../../definitions';

import { validators } from '../validators';

export interface NormalizedMinimistOpts extends MinimistOpts {
  string: string[];
  boolean: string[];
  alias: { [key: string]: string[] };
  default: { [key: string]: CommandLineInput };
}

const typeDefaults: CommandOptionTypeDefaults = new Map<CommandOptionType, CommandLineInput>()
  .set(String, null)
  .set(Boolean, false);

/**
 * Take all command line options and normalize all aliases to their proper option names
 */
export function normalizeOptionAliases(metadata: CommandData, options: CommandLineOptions): CommandLineOptions {
  if (!metadata) {
    return options;
  }
  return Object.keys(options).reduce((results: any, optionName) => {
      const metadataOptionFound = (metadata.options || []).find((mdOption) => (
        mdOption.name === optionName || (mdOption.aliases || []).includes(optionName)
      ));

      if (metadataOptionFound) {
        results[metadataOptionFound.name] = options[optionName];
      } else {
        results[optionName] = options[optionName];
      }
      return results;
    }, {});
}

export function minimistOptionsToArray(options: CommandLineOptions): string[] {
  return (Object.keys(options || {})).reduce((results, optionName): string[] => {
    const daObject = options[optionName];

    if (optionName === '_' || !daObject) {
      return results;
    }

    if (daObject === true) {
      return results.concat(`--${optionName}`);
    }
    if (typeof daObject === 'string') {
      return results.concat(`--${optionName}=${daObject}`);
    }
    if (Array.isArray(daObject)) {
      return results.concat(
        daObject.map((value: string) => (
          `--${optionName}=${value}`
        ))
      );
    }
    return results;
  }, <string[]>[]);
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

export function metadataToMinimistOptions(metadata: CommandData): NormalizedMinimistOpts {
  let options: NormalizedMinimistOpts = {
    string: [],
    boolean: [],
    alias: {},
    default: {}
  };

  if (!metadata.options) {
    return options;
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

export function validateInputs(argv: string[], metadata: CommandData) {
  if (!metadata.inputs) {
    return;
  }

  for (let i in metadata.inputs) {
    const input = metadata.inputs[i];
    const errors: ValidationError[] = [];

    if (argv[i] && input.validators) { // only run validators if input given
      for (let validator of input.validators) {
        const r = validator(argv[i], input.name);

        if (r !== true) {
          errors.push({
            message: r,
            inputName: input.name
          });
        }
      }

      if (errors.length > 0) {
        throw errors;
      }
    }
  }
}

export function filterOptionsByIntent(metadata: CommandData, options: CommandLineOptions, intentName?: string): CommandLineOptions {
  return Object.keys(options).reduce((allOptions, optionName) => {
    const metadataOptionFound = (metadata.options || []).find((mdOption) => (
      mdOption.name === optionName || (mdOption.aliases || []).includes(optionName)
    ));
    if (metadataOptionFound) {
      if (intentName && metadataOptionFound.intent === intentName) {
        allOptions[optionName] = options[optionName];
      } else if (!intentName && !metadataOptionFound.intent) {
        allOptions[optionName] = options[optionName];
      }
    }
    return allOptions;
  }, <CommandLineOptions>{});
}
