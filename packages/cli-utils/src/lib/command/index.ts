import * as superagent from 'superagent';
import * as minimist from 'minimist';

import {
  APIResponse,
  CommandData,
  CommandEnvironment,
  CommandLineInputs,
  CommandLineOptions,
  ICommand,
  INamespace,
  ValidationError
} from '../../definitions';

import { FatalException } from '../errors';
import { createFatalAPIFormat } from '../http';
import { collectInputs, metadataToMinimistOptions, validateInputs } from './utils';

export function CommandMetadata(metadata: CommandData) {
  return function (target: Function) {
    target.prototype.metadata = metadata;
  };
}

export class Command implements ICommand {
  public cli: INamespace;
  public env: CommandEnvironment;
  public metadata: CommandData;

  async load(): Promise<void> {}
  async unload(): Promise<void> {}

  async prerun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {}
  async run(inputs: CommandLineInputs, options: CommandLineOptions, validationErrors: ValidationError[]): Promise<void | number> {}

  async execute(inputs?: CommandLineInputs): Promise<void> {
    const options = metadataToMinimistOptions(this.metadata);
    const argv = minimist(this.env.pargv, options);
    let r: number | void;
    let validationErrors: ValidationError[] = [];

    if (inputs) {
      argv._ = inputs;
    }

    try {
      validateInputs(argv._, this.metadata);
    } catch (e) {
      validationErrors = e;
    }

    r = await this.prerun(argv._, argv);
    if (typeof r === 'number') {
      if (r > 0) {
        throw this.exit('', r);
      }

      return;
    }

    await collectInputs(argv._, this.metadata);

    r = await this.run(argv._, argv, validationErrors);
    if (typeof r === 'number') {
      if (r > 0) {
        throw this.exit('', r);
      }

      return;
    }
  }

  exit(msg: string, code: number = 1): FatalException {
    return new FatalException(msg, code);
  }

  exitAPIFormat(req: superagent.SuperAgentRequest, res: APIResponse): FatalException {
    return createFatalAPIFormat(req, res);
  }
}
