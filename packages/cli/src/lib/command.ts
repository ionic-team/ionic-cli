import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
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
  ICommand,
  ICommandMap,
  NormalizedCommandOption,
  Validator
} from '../definitions';

import { ERROR_PLUGIN_NOT_FOUND, PluginLoader } from './plugins';
import { validators, combine as combineValidators } from './validators';

export interface NormalizedMinimistOpts extends MinimistOpts {
  string: string[];
  boolean: string[];
  alias: { [key: string]: string[] };
  default: { [key: string]: CommandLineInput };
}

export class CommandMap extends Map<string, ICommand> implements ICommandMap {
  resolve(argv: string[], opts: { stopOnUnknown?: boolean } = {}): [string[], ICommand | undefined] {
    if (opts.stopOnUnknown === undefined) {
      opts.stopOnUnknown = false;
    }

    const command = this.get(argv[0]);

    if (command) {
      return [argv.slice(1), command];
    }

    if (argv.length === 0 || argv[0].indexOf(':') === -1) {
      return [argv, undefined];
    }

    const [pluginName, pluginCommand] = argv[0].split(':');
    const loader = new PluginLoader();

    function _resolve(argv: string[], commands: CommandMap): [string[], ICommand | undefined] {
      const command = commands.get(argv[0]);

      if (!command) {
        return [argv, undefined];
      }

      if (!command.metadata.subcommands || !command.metadata.subcommands.has(argv[1])) {
        if (opts.stopOnUnknown && argv.length > 1) {
          return [argv.slice(1), undefined];
        }

        return [argv.slice(1), command];
      }

      return _resolve(argv.slice(1), command.metadata.subcommands);
    }

    try {
      return _resolve([pluginCommand, ...argv.slice(1)], loader.load(pluginName).getCommands());
    } catch (e) {
      // If command does not exist then lets show them help
      if (e === ERROR_PLUGIN_NOT_FOUND && loader.has(pluginName)) {
        throw new Error(`
  This plugin is not currently installed. Please execute the following to install it.

      ${chalk.bold(`npm install ${loader.prefix}${pluginName}`)}
  `);
      }

      throw e;
    }
  }
}

export function CommandMetadata(metadata: CommandData) {
  // TODO: validate metadata
  //  - make sure subcommands and inputs don't clash

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

    try {
      validateInputs(this.env.argv._, this.metadata, new Set([validators.required]));
    } catch (e) {
      console.error(chalk.red('>> ') + e);
      return;
    }

    await collectInputs(this.env.argv._, this.metadata);

    return this.run(this.env.argv._, this.env.argv);
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
