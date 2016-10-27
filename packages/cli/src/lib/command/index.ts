import * as chalk from 'chalk';
import * as superagent from 'superagent';
import * as minimist from 'minimist';

import {
  APIResponse,
  CommandData,
  CommandEnvironment,
  CommandLineInputs,
  CommandLineOptions,
  ICommand,
  IIonicNamespace
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
  public cli: IIonicNamespace;
  public env: CommandEnvironment;
  public metadata: CommandData;

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {}

  async execute(cli: IIonicNamespace, env: CommandEnvironment, inputs?: CommandLineInputs): Promise<void> {
    this.cli = cli;
    this.env = env;

    const options = metadataToMinimistOptions(this.metadata);
    const argv = minimist(this.env.pargv, options);

    if (inputs) {
      argv._ = inputs;
    }

    try {
      validateInputs(argv._, this.metadata);
    } catch (e) {
      console.error(chalk.red('>> ') + e);
      return;
    }

    await collectInputs(argv._, this.metadata);

    const r = await this.run(argv._, argv);

    if (typeof r === 'number' && r > 0) {
      throw this.exit('', r);
    }
  }

  exit(msg: string, code: number = 1): FatalException {
    return new FatalException(msg, code);
  }

  exitAPIFormat(req: superagent.SuperAgentRequest, res: APIResponse): FatalException {
    return createFatalAPIFormat(req, res);
  }
}
