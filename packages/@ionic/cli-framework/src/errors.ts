import * as lodash from 'lodash';
import * as util from 'util';

import { ValidationError } from './definitions';

export const ERROR_INPUT_VALIDATION = 'ERR_ICF_INPUT_VALIDATION';
export const ERROR_COMMAND_NOT_FOUND = 'ERR_ICF_COMMAND_NOT_FOUND';
export const ERROR_IPC_MODULE_INACCESSIBLE = 'ERR_ICF_IPC_MODULE_INACCESSIBLE';
export const ERROR_IPC_UNKNOWN_PROCEDURE = 'ERR_ICF_IPC_UNKNOWN_PROCEDURE';

export abstract class BaseError extends Error {
  abstract readonly name: string;
  message: string;
  stack: string;
  code?: string;
  error?: Error;
  exitCode?: number;

  constructor(message: string) {
    super(message);
    this.message = message;
    this.stack = (new Error()).stack || '';
  }

  toString(): string {
    const repr = lodash.pick(this, lodash.pull(lodash.keys(this), 'error'));

    return (
      `${this.name}: ${this.message} ${util.inspect(repr, { breakLength: Infinity })} ${this.stack} ` +
      `${this.error ? `\nWrapped: ${this.error.stack ? this.error.stack : this.error}` : ''}`
    );
  }

  inspect(): string {
    return this.toString();
  }
}

export class InputValidationError extends BaseError {
  readonly name = 'InputValidationError';
  code = ERROR_INPUT_VALIDATION;

  constructor(message: string, public errors: ValidationError[]) {
    super(message);
  }
}

export class CommandNotFoundError extends BaseError {
  readonly name = 'CommandNotFoundError';
  code = ERROR_COMMAND_NOT_FOUND;

  constructor(message: string, public args: string[]) {
    super(message);
  }
}

export class IPCError extends BaseError {
  readonly name = 'IPCError';
}
