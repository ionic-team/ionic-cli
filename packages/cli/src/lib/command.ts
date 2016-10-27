import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import * as superagent from 'superagent';
import * as minimist from 'minimist';
import { Opts as MinimistOpts } from 'minimist';

import {
  APIResponse,
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
  IIonicNamespace,
  INamespace,
  INamespaceMap,
  NormalizedCommandOption,
  Validator
} from '../definitions';

import { FatalException } from './errors';
import { createFatalAPIFormat, formatAPIResponse } from './http';
import { validators, combine as combineValidators } from './validators';

export interface NormalizedMinimistOpts extends MinimistOpts {
  string: string[];
  boolean: string[];
  alias: { [key: string]: string[] };
  default: { [key: string]: CommandLineInput };
}

export function CommandMetadata(metadata: CommandData) {
  return function (target: Function) {
    target.prototype.metadata = metadata;
  };
}

export class NamespaceMap extends Map<string, INamespace> {}
export class CommandMap extends Map<string, ICommand> {
  set(key: string, value?: ICommand): this {
    if (value && value.metadata && value.metadata.aliases) {
      for (let alias of value.metadata.aliases) {
        super.set(alias, value);
      }
    }

    return super.set(key, value);
  }
}

export class Namespace implements INamespace {
  constructor(public env: CommandEnvironment) {}

  getNamespaces(): INamespaceMap {
    return new NamespaceMap();
  }

  getCommands(): ICommandMap {
    return new CommandMap();
  }
}

export class Command implements ICommand {
  public cli: IIonicNamespace;
  public env: CommandEnvironment;
  public metadata: CommandData;

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {}

  async execute(cli: IIonicNamespace, env: CommandEnvironment, inputs?: CommandLineInputs): Promise<void> {
    this.cli = cli;
    this.env = env;

    const options = metadataToMinimistOptions(this.metadata);
    const argv = minimist(this.env.pargv, options);

    if (inputs) {
      argv._ = inputs;
    }

    try {
      validateInputs(argv._, this.metadata);
    } catch (e) {
      console.error(chalk.red('>> ') + e);
      return;
    }

    await collectInputs(argv._, this.metadata);

    return this.run(argv._, argv);
  }

  exit(msg: string, code: number = 1): FatalException {
    return new FatalException(msg, code);
  }

  exitAPIFormat(req: superagent.SuperAgentRequest, res: APIResponse): FatalException {
    return createFatalAPIFormat(req, res);
  }
}

async function collectInputs(argv: string[], metadata: CommandData) {
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

function validateInputs(argv: string[], metadata: CommandData) {
  if (!metadata.inputs) {
    return;
  }

  for (let i in metadata.inputs) {
    const input = metadata.inputs[i];
    const skip = new Set<Validator>();

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
            throw r;
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
