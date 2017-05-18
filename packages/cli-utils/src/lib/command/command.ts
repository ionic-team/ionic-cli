import * as chalk from 'chalk';

import {
  CommandData,
  CommandLineInputs,
  CommandLineOptions,
  ICommand,
  IonicEnvironment,
  ValidationError,
} from '../../definitions';

import { isCommandPreRun } from '../../guards';
import { FatalException } from '../errors';
import { validate, validators } from '../validators';
import { validateInputs, minimistOptionsToArray } from './utils';

export class Command implements ICommand {
  public env: IonicEnvironment;
  public metadata: CommandData;

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {}

  async validate(inputs: CommandLineInputs) {
    validateInputs(inputs, this.metadata);
  }

  async execute(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let r: number | void;
    const config = await this.env.config.load();

    if (isCommandPreRun(this)) {
      r = await this.preRun(inputs, options);
      if (typeof r === 'number') {
        if (r > 0) {
          throw this.exit('', r);
        }

        return;
      }
    }

    if (this.metadata.inputs) {
      for (let input of this.metadata.inputs) {
        if (!input.validators) {
          input.validators = [];
        }

        if (input.required !== false) {
          input.validators.unshift(validators.required);
        }
      }

      try {
        // Validate inputs again, this time with required validator (prompt input
        // should've happened in preRun)
        validateInputs(inputs, this.metadata);
      } catch (e) {
        if (!config.cliFlags.interactive) {
          this.env.log.warn(`You are in non-interactive mode. Use ${chalk.green('--interactive')} to re-enable prompts.`);
        }
        throw e;
      }
    }

    const results = await Promise.all([
      (async () => {
        // TODO: get telemetry for commands that aborted above
        if (config.cliFlags.telemetry !== false) {
          let cmdInputs: CommandLineInputs = [];

          if (this.metadata.name === 'help') {
            cmdInputs = inputs;
          } else {
            cmdInputs = this.getCleanInputsForTelemetry(inputs, options);
          }

          await this.env.telemetry.sendCommand(`ionic ${this.metadata.fullName}`, cmdInputs);
        }
      })(),
      (async () => {
        await this.run(inputs, options);
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

  getCleanInputsForTelemetry(inputs: CommandLineInputs, options: CommandLineOptions) {
    if (this.metadata.inputs) {
      const mdi = this.metadata.inputs;
      inputs = inputs
        .filter((input, i) => {
          return mdi[i] && !mdi[i].private;
        });
    }

    if (this.metadata.options) {
      const mdo = this.metadata.options;
      options = Object.keys(options)
        .filter(optionName => {
          const metadataOptionFound = mdo.find((mdOption) => (
            mdOption.name === optionName || (mdOption.aliases || []).includes(optionName)
          ));
          return metadataOptionFound ? !metadataOptionFound.private : true;
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
