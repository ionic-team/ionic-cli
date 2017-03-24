import * as chalk from 'chalk';
import * as superagent from 'superagent';
import * as minimist from 'minimist';

import {
  APIResponse,
  CommandData,
  IonicEnvironment,
  CommandLineInputs,
  CommandLineOptions,
  ICommand,
  ValidationError
} from '../../definitions';

import { FatalException } from '../errors';
import { createFatalAPIFormat } from '../http';
import { collectInputs, metadataToMinimistOptions, validateInputs, minimistOptionsToArray } from './utils';

export function CommandMetadata(metadata: CommandData) {
  return function (target: Function) {
    target.prototype.metadata = metadata;
  };
}

export class Command implements ICommand {
  public env: IonicEnvironment;
  public metadata: CommandData;

  async load(): Promise<void> {}
  async unload(): Promise<void> {}

  async prerun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {}
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {}

  async execute(inputs?: CommandLineInputs): Promise<void> {
    const options = metadataToMinimistOptions(this.metadata);
    const argv = minimist(this.env.pargv, options);
    let r: number | void;

    if (inputs) {
      argv._ = inputs;
    }

    try {
      validateInputs(argv._, this.metadata);
    } catch (e) {
      const errors = <ValidationError[]>e; // TODO: better way?
      console.error(errors.map(err => chalk.red('>> ') + err.message).join('\n'));
      return;
    }

    r = await this.prerun(argv._, argv);
    if (typeof r === 'number') {
      if (r > 0) {
        throw this.exit('', r);
      }

      return;
    }

    await collectInputs(argv._, this.metadata);

    const results = await Promise.all([
      (async () => {
        const configData = await this.env.config.load();
        if (configData.cliFlags.enableTelemetry !== false) {
          const cmdInputs = this.getCleanInputsForTelemetry(argv._, argv);
          await this.env.telemetry.sendCommand(
            (this.env.namespace.name) ? `${this.env.namespace.name}:${this.metadata.name}` : this.metadata.name,
            cmdInputs
          );
        }
      })(),
      (async() => {
        await this.run(argv._, argv);
      })()
    ]);

    r = results[1];

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

  getCleanInputsForTelemetry(inputs: CommandLineInputs, options: CommandLineOptions) {
    if (this.metadata.inputs) {
      const mdi = this.metadata.inputs;
      inputs = inputs
        .filter((input, i) => {
          return !mdi[i].private;
        });
    }

    if (this.metadata.options) {
      const mdo = this.metadata.options;
      options = Object.keys(options)
        .filter(optionName => {
          const metadataOptionFound = mdo.find((mdOption) => (
            mdOption.name === optionName || (mdOption.aliases || []).includes(optionName)
          ));
          return (metadataOptionFound) ? !metadataOptionFound.private : true;
        })
        .reduce((allOptions, optionName) => {
          allOptions[optionName] = options[optionName];
          return allOptions;
        }, <CommandLineOptions>{});
    }

    let optionInputs = minimistOptionsToArray(options);
    return inputs.concat(optionInputs);
  }
}
