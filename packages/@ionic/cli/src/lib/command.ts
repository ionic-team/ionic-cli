import { BaseCommand, LOGGER_LEVELS, LogUpdateOutputStrategy, OutputStrategy, StreamHandler, StreamOutputStrategy, TaskChain, generateCommandPath, unparseArgs } from '@ionic/cli-framework';
import { TERMINAL_INFO } from '@ionic/utils-terminal';

import { CommandInstanceInfo, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataInput, CommandMetadataOption, ICommand, INamespace, IProject, IonicEnvironment } from '../definitions';
import { isCommandPreRun } from '../guards';

import { input } from './color';
import { createDefaultLoggerHandlers, createFormatter } from './utils/logger';

export abstract class Command extends BaseCommand<ICommand, INamespace, CommandMetadata, CommandMetadataInput, CommandMetadataOption> implements ICommand {
  protected readonly taskChains: TaskChain[] = [];

  constructor(public namespace: INamespace) {
    super(namespace);
  }

  get env(): IonicEnvironment {
    return this.namespace.root.env;
  }

  get project(): IProject | undefined {
    return this.namespace.root.project;
  }

  createTaskChain(): TaskChain {
    let output: OutputStrategy;

    const formatter = createFormatter();

    if (this.env.flags.interactive) {
      output = new LogUpdateOutputStrategy();
      this.env.log.handlers = new Set([new StreamHandler({ stream: output.stream, formatter })]);
    } else {
      this.env.log.handlers = createDefaultLoggerHandlers();
      output = new StreamOutputStrategy({ stream: this.env.log.createWriteStream(LOGGER_LEVELS.INFO, false) });
    }

    const chain = output.createTaskChain();
    this.taskChains.push(chain);

    chain.on('end', () => {
      this.env.log.handlers = createDefaultLoggerHandlers();
    });

    return chain;
  }

  async execute(inputs: CommandLineInputs, options: CommandLineOptions, runinfo: CommandInstanceInfo): Promise<void> {
    if (isCommandPreRun(this)) {
      await this.preRun(inputs, options, runinfo);
    }

    try {
      await this.validate(inputs);
    } catch (e) {
      if (!this.env.flags.interactive) {
        this.env.log.warn(`Command ran non-interactively due to ${input('--no-interactive')} flag, CI being detected, non-TTY, or a config setting.`);
      }

      throw e;
    }

    const runPromise = this.run(inputs, options, runinfo);

    const telemetryPromise = (async () => {
      if (this.env.config.get('telemetry') !== false && !TERMINAL_INFO.ci && TERMINAL_INFO.tty) {
        const { Telemetry } = await import('./telemetry');

        let cmdInputs: CommandLineInputs = [];
        const metadata = await this.getMetadata();

        if (metadata.name === 'login' || metadata.name === 'logout') {
          // This is a hack to wait until the selected commands complete before
          // sending telemetry data. These commands update `this.env` in some
          // way, which is used in the `Telemetry` instance.
          await runPromise;
        } else if (metadata.name === 'completion') {
          // Ignore telemetry for these commands.
          return;
        } else if (metadata.name === 'help') {
          cmdInputs = inputs;
        } else {
          cmdInputs = await this.getCleanInputsForTelemetry(inputs, options);
        }

        const cmd: ICommand = this;
        const path = await generateCommandPath(cmd);
        const telemetry = new Telemetry({ client: this.env.client, config: this.env.config, getInfo: this.env.getInfo, ctx: this.env.ctx, project: this.project, session: this.env.session });

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
