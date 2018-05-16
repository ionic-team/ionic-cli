import { BaseError } from '@ionic/cli-framework/lib/errors';

export class BaseException extends BaseError {
  readonly name = 'Exception';
}

export class FatalException extends BaseException {
  fatal = true;

  constructor(public message = '', public exitCode = 1) {
    super(message);
  }
}

export class ServeException extends BaseException {}

export class ServeCommandNotFoundException extends ServeException {}

export class SessionException extends BaseException {}

export class RunnerException extends BaseException {}

export class RunnerNotFoundException extends RunnerException {}

export class IntegrationException extends BaseException {}

export class IntegrationNotFoundException extends IntegrationException {}

export class HookException extends BaseException {}
