import * as chalk from 'chalk';

import { Validator, Validators } from '../definitions';
import { isValidEmail } from './utils/string';

// TODO: typescript isn't enforcing input?: string
export const validators: Validators = {
  email(input: string, key?: string): true | string {
    if (!isValidEmail(input)) {
      if (key) {
        return `${chalk.bold(key)} is an invalid email address.`;
      } else {
        return 'Invalid email address.';
      }
    }

    return true;
  },
  numeric(input: string, key?: string): true | string {
    if (isNaN(Number(input))) {
      if (key) {
        return `${chalk.bold(key)} must be numeric.`;
      } else {
        return 'Must be numeric.';
      }
    }

    return true;
  },
};

export function contains(values: (string | undefined)[], { caseSensitive = true }: { caseSensitive?: boolean }): Validator {
  if (!caseSensitive) {
    values = values.map(v => typeof v === 'string' ? v.toLowerCase() : v);
  }

  return function(input?: string, key?: string): true | string {
    if (!caseSensitive && typeof input === 'string') {
      input = input.toLowerCase();
    }

    if (values.indexOf(input) === -1) {
      const strValues = <string[]>values.filter((v): v is string => typeof v === 'string'); // TODO: typescript bug?
      const mustBe = (strValues.length !== values.length ? 'unset or one of' : 'one of') + ': ' + strValues.map(v => chalk.green(v)).join(', ');
      if (key) {
        return `${chalk.bold(key)} must be ${mustBe} (not ${typeof input === 'undefined' ? 'unset' : chalk.green(input)})`;
      } else {
        return `Must be ${mustBe} (not ${typeof input === 'undefined' ? 'unset' : chalk.green(input)})`;
      }
    }

    return true;
  };
}
