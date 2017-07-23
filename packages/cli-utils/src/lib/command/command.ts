import * as chalk from 'chalk';

import {
  CommandData,
  CommandLineInputs,
  CommandLineOptions,
  ICommand,
  IonicEnvironment,
} from '../../definitions';

import { isCommandPreRun } from '../../guards';
import { FatalException } from '../errors';
import { validators } from '../validators';
import { minimistOptionsToArray, validateInputs } from './utils';

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

  async runcmd(pargv: string[]): Promise<void> {
    await this.runwrap(async () => {
      this.env.log.msg(`> ${chalk.green([this.env.namespace.name, ...pargv].map(a => a.includes(' ') ? `"${a}"` : a).join(' '))}`);
      return this.env.namespace.runCommand(this.env, pargv);
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

    await Promise.all([
      (async () => {
        // TODO: get telemetry for commands that aborted above
        if (config.telemetry !== false) {
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
        await this.runwrap(() => this.run(inputs, options));
      })()
    ]);
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
