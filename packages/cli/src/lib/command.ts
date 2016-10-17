import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import * as minimist from 'minimist';
import { Opts as MinimistOpts } from 'minimist';

import {
  CommandData,
  CommandEnvironment,
  CommandOption,
  CommandLineInput,
  CommandLineInputs,
  CommandLineOptions,
  CommandOptionType,
  CommandOptionTypeDefaults,
  NormalizedCommandOption,
  Validator
} from '../definitions';

import { validators, combine as combineValidators } from './validators';

export interface NormalizedMinimistOpts extends MinimistOpts {
  string: string[],
  boolean: string[],
  alias: { [key: string]: string[] },
  default: { [key: string]: CommandLineInput }
}

export function CommandMetadata(metadata: CommandData) {
  return function (target: Function) {
    target.prototype.metadata = metadata;
  };
}

export abstract class Command {
  public env: CommandEnvironment;
  public metadata: CommandData;

  abstract async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void>;

  async execute(env: CommandEnvironment): Promise<void> {
    this.env = env;

    const options = metadataToOptimistOptions(this.metadata);
    const argv = minimist(this.env.argv.slice(3), options);

    try {
      validateInputs(argv._, this.metadata, new Set([validators.required]));
    } catch(e) {
      console.error(chalk.red('>> ') + e);
      return;
    }

    await collectInputs(argv._, this.metadata);

    return this.run(argv._, argv);
  }
}

async function collectInputs(argv: string[], metadata: CommandData) {
  if (metadata.inputs) {
    let questionsToRemove: number[] = [];
    const questions = metadataToInquirerQuestions(metadata);
    const inputIndexByName = new Map<string, number>(
      metadata.inputs.map((input, i): [string, number] => [input.name, i])
    );

    if (questions) {
      for (let question of questions) {
        let i = inputIndexByName.get(question.name);

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

      for (let name in answers) {
        let i = inputIndexByName.get(name);

        if (i !== undefined) {
          argv[i] = String(answers[name]);
        }
      }
    }
  }
}

function validateInputs(argv: string[], metadata: CommandData, skip: Set<Validator> = new Set<Validator>()) {
  if (metadata.inputs) {
    for (let i in metadata.inputs) {
      let input = metadata.inputs[i];

      if (input.validators) {
        for (let validator of input.validators) {
          // If we're supposed to skip the 'required' validator and the
          // argument has no value, then we can pass validation because later
          // validators will fail on an empty value.
          if (skip.has(validators.required) && !argv[i]) {
            continue;
          }

          if (!skip.has(validator)) {
            let r = validator(argv[i]);

            if (r !== true) {
              throw r;
            }
          }
        }
      }
    }
  }
}

const typeDefaults: CommandOptionTypeDefaults = new Map<CommandOptionType, CommandLineInput>()
  .set(String, null)
  .set(Boolean, false);

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

export function metadataToOptimistOptions(metadata: CommandData): NormalizedMinimistOpts {
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
