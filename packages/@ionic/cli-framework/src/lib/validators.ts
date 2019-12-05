import * as chalk from 'chalk';

import { ValidationError, Validator, Validators } from '../definitions';
import { InputValidationError } from '../errors';
import { isValidEmail, isValidURL, slugify } from '../utils/string';

export function validate(input: string, key: string, validatorsToUse: Validator[]): void {
  const errors: ValidationError[] = [];

  for (const validator of validatorsToUse) {
    const message = validator(input, key);

    if (message !== true) {
      errors.push({ key, message, validator });
    }
  }

  if (errors.length > 0) {
    throw new InputValidationError('Invalid inputs.', errors);
  }
}

export const validators: Validators = {
  required(input?: string, key?: string) {
    if (!input) {
      if (key) {
        return `${chalk.green(key)} must not be empty.`;
      } else {
        return 'Must not be empty.';
      }
    }

    return true;
  },
  email(input?: string, key?: string) {
    if (!isValidEmail(input)) {
      if (key) {
        return `${chalk.green(key)} is an invalid email address.`;
      } else {
        return 'Invalid email address.';
      }
    }

    return true;
  },
  url(input?: string, key?: string) {
    if (!isValidURL(input)) {
      if (key) {
        return `${chalk.green(key)} is an invalid URL.`;
      } else {
        return 'Invalid URL.';
      }
    }

    return true;
  },
  numeric(input?: string, key?: string) {
    if (isNaN(Number(input))) {
      if (key) {
        return `${chalk.green(key)} must be numeric.`;
      } else {
        return 'Must be numeric.';
      }
    }

    return true;
  },
  slug(input?: string, key?: string) {
    if (!input || slugify(input) !== input) {
      if (key) {
        return `${chalk.green(key)} is an invalid slug (machine name).`;
      } else {
        return 'Invalid slug (machine name).';
      }
    }

    return true;
  },
};

export function combine(...validators: Validator[]): Validator {
  return (input?: string, key?: string) => {
    for (const validator of validators) {
      const message = validator(input, key);

      if (message !== true) {
        return message;
      }
    }

    return true;
  };
}

export function contains(values: (string | undefined)[], { caseSensitive = true }: { caseSensitive?: boolean }): Validator {
  if (!caseSensitive) {
    values = values.map(v => typeof v === 'string' ? v.toLowerCase() : v);
  }

  return (input?: string, key?: string): true | string => {
    if (!caseSensitive && typeof input === 'string') {
      input = input.toLowerCase();
    }

    if (values.indexOf(input) === -1) {
      const strValues = values.filter(v => typeof v === 'string') as string[]; // TODO: typescript bug?
      const mustBe = (strValues.length !== values.length ? 'unset or one of' : 'one of') + ': ' + strValues.map(v => chalk.green(v)).join(', ');
      const fmtPretty = (v?: string) => typeof v === 'undefined' ? 'unset' : (v === '' ? 'empty' : chalk.green(v));

      if (key) {
        return `${chalk.green(key)} must be ${mustBe} (not ${fmtPretty(input)})`;
      } else {
        return `Must be ${mustBe} (not ${fmtPretty(input)})`;
      }
    }

    return true;
  };
}
