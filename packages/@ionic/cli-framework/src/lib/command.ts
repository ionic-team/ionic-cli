import {
  CommandData,
  CommandLineInputs,
  CommandLineOptions,
  ValidationError,
} from '../definitions';

import { validate, validators } from './validators';

export abstract class Command<T extends CommandData> {
  public readonly metadata: T;

  async validate(inputs: CommandLineInputs): Promise<void> {
    validateInputs(inputs, this.metadata);
  }

  abstract run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void>;
}

export function validateInputs(argv: string[], metadata: CommandData) {
  if (!metadata.inputs) {
    return;
  }

  const errors: ValidationError[] = [];

  for (let i in metadata.inputs) {
    const input = metadata.inputs[i];

    if (input.validators && input.validators.length > 0) {
      const vnames = input.validators.map(v => v.name);

      if (vnames.includes('required')) { // required validator is special
        validate(argv[i], input.name, [validators.required], errors);
      } else {
        if (argv[i]) { // only run validators if input given
          validate(argv[i], input.name, input.validators, errors);
        }
      }
    }
  }

  if (errors.length > 0) {
    throw errors;
  }
}
