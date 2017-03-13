import * as inquirer from 'inquirer';
import { Opts as MinimistOpts } from 'minimist';

import {
  CommandData,
  CommandOption,
  CommandLineInput,
  CommandLineOptions,
  CommandOptionType,
  CommandOptionTypeDefaults,
  NormalizedCommandOption,
  Validator,
  ValidationError
} from '../../definitions';

import { validators, combine as combineValidators } from '../validators';

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

export function metadataToInquirerQuestions(metadata: CommandData): inquirer.Question[] {
  let questions: inquirer.Question[] = [];

  if (!metadata.inputs) {
    return questions;
  }

  for (let input of metadata.inputs) {
    if (input.prompt) {
      let o: Object[] = [];

      if (input.validators) {
        o.push({ validate: combineValidators(input.validators) });
      }

      o.push(input.prompt);

      questions.push(Object.assign({ name: input.name, message: input.description }, ...o));
    }
  }

  return questions;
}

export function validateInputs(argv: string[], metadata: CommandData) {
  if (!metadata.inputs) {
    return;
  }

  for (let i in metadata.inputs) {
    const input = metadata.inputs[i];
    const skip = new Set<Validator>();
    const errors: ValidationError[] = [];

    if (input.prompt) {
      skip.add(validators.required);
    }

    if (input.validators) {
      for (let validator of input.validators) {
        // If we're supposed to skip the 'required' validator and the
        // argument has no value, then we can pass validation because later
        // validators will fail on an empty value.
        if (skip.has(validators.required) && !argv[i]) {
          continue;
        }

        if (!skip.has(validator)) {
          let r = validator(argv[i], input.name);

          if (r !== true) {
            errors.push({
              message: r.toString(),
              inputName: input.name
            });
          }
        }
      }

      if (errors.length > 0) {
        throw errors;
      }
    }
  }
}

export async function collectInputs(argv: string[], metadata: CommandData) {
  if (!metadata.inputs) {
    return;
  }

  let questionsToRemove: number[] = [];
  const questions = metadataToInquirerQuestions(metadata);
  const inputIndexByName = new Map<string, number>(
    metadata.inputs.map((input, i): [string, number] => [input.name, i])
  );

  if (questions) {
    for (let question of questions) {
      let i = inputIndexByName.get(question.name || '');

      if (i !== undefined) {
        let v = argv[i];

        if (v !== undefined) {
          questionsToRemove.push(i);
        }
      }
    }

    for (let i of questionsToRemove.sort((a, b) => b - a)) {
      questions.splice(i, 1);
    }

    const answers = await inquirer.prompt(questions);

    Object.keys(answers).forEach(function(name) {
      let i = inputIndexByName.get(name);

      if (i !== undefined) {
        argv[i] = answers[name];
      }
    });
  }
}
