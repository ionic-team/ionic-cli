import { PromptModule } from '@ionic/cli-framework';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, GenerateOptions, IConfig, ILogger, IProject, IShell, Runner } from '../definitions';

export interface GenerateRunnerDeps {
  readonly config: IConfig;
  readonly log: ILogger;
  readonly project: IProject;
  readonly prompt: PromptModule;
  readonly shell: IShell;
}

export abstract class GenerateRunner<T extends GenerateOptions> implements Runner<T, void> {
  protected readonly config: IConfig;
  protected readonly log: ILogger;
  protected readonly project: IProject;
  protected readonly prompt: PromptModule;
  protected readonly shell: IShell;

  constructor({ config, log, project, prompt, shell }: GenerateRunnerDeps) {
    this.config = config;
    this.log = log;
    this.project = project;
    this.prompt = prompt;
    this.shell = shell;
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): GenerateOptions {
    const [ type, name ] = inputs;
    return { type, name };
  }

  async ensureCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> { /* overwritten in subclasses */ }
  abstract getCommandMetadata(): Promise<Partial<CommandMetadata>>;
  abstract run(options: T): Promise<void>;
}
