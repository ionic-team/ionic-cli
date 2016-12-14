export class Exception extends Error {
  public name: string;
  public stack: string;

  constructor(public message: string) {
    super(message);
    this.name = 'Exception';
    this.stack = (<any>new Error()).stack;
  }

  public toString() {
    return `${this.name}: ${this.message}`;
  }
}

export class FatalException extends Exception {
  constructor(public message: string, public exitCode: number = 1) {
    super(message);
  }
}
