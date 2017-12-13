import * as dargs from 'dargs';
import * as minimist from 'minimist';

import {
  CommandData,
  CommandLineInput,
  CommandLineInputs,
  CommandLineOptions,
  CommandOption,
  CommandOptionType,
  CommandOptionTypeDefaults,
  NormalizedCommandOption,
  NormalizedMinimistOpts,
  ValidationError,
} from '../definitions';

import { InputValidationError } from './errors';
import { validate } from './validators';

export const parseArgs = minimist;
export { ParsedArgs } from 'minimist';

export abstract class Command<T extends CommandData> {
  public readonly metadata: T;

  async validate(inputs: CommandLineInputs): Promise<void> {
    await validateInputs(inputs, this.metadata);
  }

  abstract run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void>;
}

const typeDefaults: CommandOptionTypeDefaults = new Map<CommandOptionType, CommandLineInput>()
  .set(String, null)
  .set(Boolean, false);

export interface MinimistOptionsToArrayOptions extends dargs.Options {
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
  const type = option.type ? option.type : String;

  return {
    type,
    default: option.default ? option.default : typeDefaults.get(type),
    aliases: option.aliases ? option.aliases : [],
    ...option,
  };
}

export function metadataToMinimistOptions(metadata: CommandData): minimist.Opts {
  const options: NormalizedMinimistOpts = {
    string: ['_'],
    boolean: [],
    alias: {},
    default: {}
  };

  if (!metadata.options) {
    return { boolean: true, string: '_' };
  }

  const schema = metadataToEnvCmdOptsSchema(metadata);

  for (let opt of schema) {
    const envvar = process.env[opt.envvar];

    if (typeof envvar !== 'undefined') {
      if (opt.option.type === Boolean) {
        opt.option.default = envvar && envvar !== '0' ? true : false;
      } else {
        opt.option.default = envvar;
      }
    }
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

export interface CmdOptsSchema {
  envvar: string;
  option: CommandOption;
}

export function metadataToEnvCmdOptsSchema(metadata: CommandData): CmdOptsSchema[] {
  if (!metadata.options) {
    return [];
  }

  const schema: CmdOptsSchema[] = [];
  const fullName = metadata.fullName ? metadata.fullName : metadata.name;
  const prefix = `IONIC_CMDOPTS_${fullName.toUpperCase().split(' ').join('_')}`;

  for (let option of metadata.options) {
    schema.push({ envvar: `${prefix}_${option.name.toUpperCase().split('-').join('_')}`, option });
  }

  return schema;
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

export async function validateInputs(argv: string[], metadata: CommandData): Promise<void> {
  const flatten = await import('lodash/flatten');

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
