import chalk from 'chalk';

import { BaseCommand, generateCommandPath, unparseArgs } from '@ionic/cli-framework';

import {
  CommandInstanceInfo,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  CommandMetadataInput,
  CommandMetadataOption,
  ICommand,
  INamespace,
  IonicEnvironment,
} from '../definitions';

import { isCommandPreRun } from '../guards';

export abstract class Command extends BaseCommand<ICommand, INamespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> implements ICommand {
  constructor(public namespace: INamespace, public env: IonicEnvironment) {
    super(namespace);
  }

  async execute(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    const config = await this.env.config.load();

    if (isCommandPreRun(this)) {
      await this.preRun(inputs, options, runinfo);
    }

    try {
      await this.validate(inputs);
    } catch (e) {
      if (!this.env.flags.interactive) {
        this.env.log.warn(`Command ran non-interactively due to ${chalk.green('--no-interactive')} flag, CI being detected, non-TTY, or a config setting.`);
      }

      throw e;
    }

    const runPromise = this.run(inputs, options, runinfo);

    const telemetryPromise = (async () => {
      if (config.telemetry !== false) {
        const { Telemetry } = await import('./telemetry');

        let cmdInputs: CommandLineInputs = [];
        const metadata = await this.getMetadata();

        if (metadata.name === 'login' || metadata.name === 'logout') {
          await runPromise;
        } else if (metadata.name === 'help') {
          cmdInputs = inputs;
        } else {
          cmdInputs = await this.getCleanInputsForTelemetry(inputs, options);
        }

        const cmd: ICommand = this;
        const path = await generateCommandPath(cmd);
        const telemetry = new Telemetry({ client: this.env.client, config: this.env.config, getInfo: this.env.getInfo, ctx: this.env.ctx, project: this.env.project, session: this.env.session });

        await telemetry.sendCommand(path.map(([p]) => p).join(' '), cmdInputs);
      }
    })();

    await Promise.all([runPromise, telemetryPromise]);
  }

  async getCleanInputsForTelemetry(inputs: CommandLineInputs, options: CommandLineOptions): Promise<string[]> {
    const initialOptions: CommandLineOptions = { _: [] };

    const metadata = await this.getMetadata();
    const filteredInputs = inputs.map((input, i) => metadata.inputs && (metadata.inputs[i] && metadata.inputs[i].private) ? '*****' : input);
    const filteredOptions = Object.keys(options)
      .filter(optionName => {
        if (optionName === '_') {
          return false;
        }

        const metadataOption = metadata.options && metadata.options.find(o => {
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

    const optionInputs = unparseArgs(filteredOptions, { useDoubleQuotes: true });
    return filteredInputs.concat(optionInputs);
  }
}
