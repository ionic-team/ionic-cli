import { Validator, Validators } from '../definitions';

import { isValidEmail } from './utils';

export const validators: Validators = {
  required: function(input: string): boolean | string {
    if (!input) {
      return 'Must not be empty.';
    }

    return true;
  },
  email: function(input: string): boolean | string {
    if (!isValidEmail(input)) {
      return 'Invalid email address.';
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
