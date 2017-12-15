import { ValidationError } from '../definitions';

export class BaseError extends Error {
  public message: string;
  public name: string;
  public stack: string;

  constructor(message: string) {
    super(message);
    this.name = 'Exception';
    this.message = message;
    this.stack = (new Error()).stack || '';
  }

  public toString() {
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
