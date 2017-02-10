import * as chalk from 'chalk';

import { Validator, Validators } from '../definitions';
import { isValidEmail } from './utils';

export const validators: Validators = {
  required(input: string, key?: string): boolean | string {
    if (!input) {
      if (key) {
        return `${chalk.bold(key)} must not be empty.`;
      } else {
        return 'Must not be empty.';
      }
    }

    return true;
  },
  email(input: string, key?: string): boolean | string {
    if (!isValidEmail(input)) {
      if (key) {
        return `${chalk.bold(key)} is an invalid email address.`;
      } else {
        return 'Invalid email address.';
      }
    }

    return true;
  }
};

export function combine(validators: Validator[]): Validator {
  return function(input: string): boolean | string {
    for (let v of validators) {
      let o = v(input);
      if (o !== true) {
        return o;
      }
    }

    return true;
  };
}

export function contains(values: string[]): Validator {
  return function(input: string): boolean | string {
    return values.indexOf(input) !== 0;
  };
}
