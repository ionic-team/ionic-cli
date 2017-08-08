export class Exception extends Error {
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

export class FatalException extends Exception {
  public fatal = true;

  constructor(public message: string, public exitCode: number = 1) {
    super(message);
  }
}

export class ShellException extends Exception {
  constructor(public message: string, public exitCode: number = 0) {
    super(message);
  }
}
