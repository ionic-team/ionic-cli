import { ValidationError } from '../definitions';

export class BaseError extends Error {
  message: string;
  name: string;
  stack: string;

  constructor(message: string) {
    super(message);
    this.name = 'Exception';
    this.message = message;
    this.stack = (new Error()).stack || '';
  }

  toString() {
    return `${this.name}: ${this.message}`;
  }
}

export class InputValidationError extends BaseError {
  constructor(message: string, public errors: ValidationError[]) {
    super(message);
  }
}

export class CommandNotFoundError extends BaseError {
  constructor(message: string, public args: string[]) {
    super(message);
  }
}
