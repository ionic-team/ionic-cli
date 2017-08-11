import * as chalk from 'chalk';

import {
  CommandData,
  CommandLineInputs,
  CommandLineOptions,
  ICommand,
  IonicEnvironment,
} from '../definitions';

import { isCommandPreRun } from '../guards';
import { FatalException } from './errors';
import { validators } from './validators';
import { minimistOptionsToArray, validateInputs } from './utils/command';

export function CommandMetadata(metadata: CommandData) {
  return function (target: Function) {
    target.prototype.metadata = metadata;
  };
}

export class Command implements ICommand {
  public env: IonicEnvironment;
  public metadata: CommandData;

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {}

  async runwrap(fn: () => Promise<void | number>, opts: { exit0?: boolean } = {}): Promise<void> {
    if (typeof opts.exit0 === 'undefined') {
      opts.exit0 = true;
    }

    const r = await fn();

    if (typeof r === 'number' && (r > 0 || (r === 0 && opts.exit0))) {
      throw this.exit('', r);
    }
  }

  async runcmd(pargv: string[], opts: { showExecution?: boolean; } = {}): Promise<void> {
    await this.runwrap(async () => {
      await this.env.runcmd(pargv, opts);
    }, { exit0: false });
  }

  async validate(inputs: CommandLineInputs) {
    validateInputs(inputs, this.metadata);
  }

  async execute(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const config = await this.env.config.load();

    await this.runwrap(async () => {
      if (isCommandPreRun(this)) {
        return this.preRun(inputs, options);
      }
    });

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
        if (!this.env.flags.interactive) {
          this.env.log.warn(`Command ran non-interactively due to ${chalk.green('--no-interactive')} (or CI detected).`);
        }

        throw e;
      }
    }

    const runPromise = (async () => {
      await this.runwrap(() => this.run(inputs, options));
    })();

    const telemetryPromise = (async () => {
      if (config.telemetry !== false) {
        let cmdInputs: CommandLineInputs = [];

        if (this.metadata.name === 'login' || this.metadata.name === 'logout') {
          await runPromise;
        } else if (this.metadata.name === 'help') {
          cmdInputs = inputs;
        } else {
          cmdInputs = await this.getCleanInputsForTelemetry(inputs, options);
        }

        await this.env.telemetry.sendCommand(`ionic ${this.metadata.fullName}`, cmdInputs);
      }
    })();

    await Promise.all([runPromise, telemetryPromise]);
  }

  exit(msg: string, code: number = 1): FatalException {
    return new FatalException(msg, code);
  }

  async getCleanInputsForTelemetry(inputs: CommandLineInputs, options: CommandLineOptions): Promise<string[]> {
    const initialOptions: CommandLineOptions = { _: [] };

    const filteredInputs = inputs.filter((input, i) => !this.metadata.inputs || (this.metadata.inputs[i] && !this.metadata.inputs[i].private));
    const filteredOptions = Object.keys(options)
      .filter(optionName => {
        const metadataOption = this.metadata.options && this.metadata.options.find((o) => {
          return o.name === optionName || (typeof o.aliases !== 'undefined' && o.aliases.includes(optionName));
        });

        if (metadataOption && metadataOption.aliases && metadataOption.aliases.includes(optionName)) {
          return false; // exclude aliases
        }

        if (!metadataOption) {
          return true; // include unknown options
        }

        if (metadataOption.private) {
          return false; // exclude private options
        }

        if (typeof metadataOption.default !== 'undefined' && metadataOption.default === options[optionName]) {
          return false; // exclude options that match their default value (means it wasn't supplied by user)
        }

        return true;
      })
      .reduce((allOptions, optionName) => {
        allOptions[optionName] = options[optionName];
        return allOptions;
      }, initialOptions);

    const optionInputs = minimistOptionsToArray(filteredOptions, { useDoubleQuotes: true });
    return filteredInputs.concat(optionInputs);
  }
}
