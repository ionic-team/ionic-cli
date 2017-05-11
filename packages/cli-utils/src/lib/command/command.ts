import {
  CommandData,
  CommandLineInputs,
  CommandLineOptions,
  ICommand,
  IonicEnvironment,
  ValidationError,
} from '../../definitions';

import { isValidationErrorArray, isCommandPreRun, isCommandPreInputsPrompt } from '../../guards';
import { FatalException } from '../errors';
import { collectInputs, validateInputs, minimistOptionsToArray } from './utils';

export class Command implements ICommand {
  public env: IonicEnvironment;
  public metadata: CommandData;

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> { }

  validate(inputs: CommandLineInputs): ValidationError[] {
    try {
      validateInputs(inputs, this.metadata);
    } catch (e) {
      if (isValidationErrorArray(e)) {
        return e;
      } else {
        throw e;
      }
    }

    return [];
  }

  async execute(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    let r: number | void;

    if (isCommandPreInputsPrompt(this)) {
      r = await this.preInputsPrompt(inputs);
      if (typeof r === 'number') {
        if (r > 0) {
          throw this.exit('', r);
        }

        return;
      }
    }

    await collectInputs(this.env, inputs, this.metadata);

    if (isCommandPreRun(this)) {
      r = await this.preRun(inputs, options);
      if (typeof r === 'number') {
        if (r > 0) {
          throw this.exit('', r);
        }

        return;
      }
    }

    const results = await Promise.all([
      (async () => {
        // TODO: get telemetry for commands that aborted above
        const configData = await this.env.config.load();
        if (configData.cliFlags.enableTelemetry !== false) {
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
