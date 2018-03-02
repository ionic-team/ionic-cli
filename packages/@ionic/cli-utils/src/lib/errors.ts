import { BaseError } from '@ionic/cli-framework/lib/errors';

export class FatalException extends BaseError {
  fatal = true;

  constructor(public message = '', public exitCode = 1) {
    super(message);
  }
}

export class ShellException extends BaseError {
  constructor(public message: string, public exitCode = 0) {
    super(message);
  }
}

export class ServeException extends BaseError {}

export class ServeCommandNotFoundException extends ServeException {}

export class SessionException extends BaseError {}

export class RunnerException extends BaseError {}

export class RunnerNotFoundException extends RunnerException {}

export class IntegrationException extends BaseError {}

export class IntegrationNotFoundException extends IntegrationException {}

export class HookException extends BaseError {}
