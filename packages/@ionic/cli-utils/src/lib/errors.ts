export class Exception extends Error {
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

export class FatalException extends Exception {
  fatal = true;

  constructor(public message = '', public exitCode = 1) {
    super(message);
  }
}

export class ShellException extends Exception {
  constructor(public message: string, public exitCode = 0) {
    super(message);
  }
}

export class SessionException extends Exception {}

export class RunnerException extends Exception {}

export class RunnerNotFoundException extends RunnerException {}
