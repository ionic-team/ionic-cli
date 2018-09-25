import { BaseError } from '@ionic/cli-framework';

export class BaseException extends BaseError {
  readonly name = 'Exception';
}

export class FatalException extends BaseException {
  fatal = true;

  constructor(public message = '', public exitCode = 1) {
    super(message);
  }
}

export class BuildCLIProgramNotFoundException extends BaseException {}

export class ServeCLIProgramNotFoundException extends BaseException {}

export class SessionException extends BaseException {}

export class RunnerException extends BaseException {}

export class RunnerNotFoundException extends RunnerException {}

export class IntegrationException extends BaseException {}

export class IntegrationNotFoundException extends IntegrationException {}

export class HookException extends BaseException {}
