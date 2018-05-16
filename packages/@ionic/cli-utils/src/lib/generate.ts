import chalk from 'chalk';

import { PromptModule } from '@ionic/cli-framework';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, GenerateOptions, IConfig, ILogger, IProject, IShell, IonicEnvironment, ProjectType, Runner } from '../definitions';
import { FatalException, RunnerException, RunnerNotFoundException } from './errors';
import { prettyProjectName } from './project';

import * as angularGenerateLibType from './project/angular/generate';
import * as ionicAngularGenerateLibType from './project/ionic-angular/generate';

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

  static async createFromProjectType(env: IonicEnvironment, type: 'angular'): Promise<angularGenerateLibType.GenerateRunner>;
  static async createFromProjectType(env: IonicEnvironment, type: 'ionic-angular'): Promise<ionicAngularGenerateLibType.GenerateRunner>;
  static async createFromProjectType(env: IonicEnvironment, type?: ProjectType): Promise<GenerateRunner<any>>;
  static async createFromProjectType(env: IonicEnvironment, type?: ProjectType): Promise<GenerateRunner<any>> {
    if (type === 'angular') {
      const { GenerateRunner } = await import('./project/angular/generate');
      return new GenerateRunner(env);
    } else if (type === 'ionic-angular') {
      const { GenerateRunner } = await import('./project/ionic-angular/generate');
      return new GenerateRunner(env);
    } else {
      throw new RunnerNotFoundException(
        `Generators are not supported in this project type (${chalk.bold(prettyProjectName(env.project.type))}).` +
        (type === 'custom' ? `Since you're using the ${chalk.bold('custom')} project type, this command won't work. The Ionic CLI doesn't know how to generate components for custom projects.\n\n` : '')
      );
    }
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): GenerateOptions {
    const [ type, name ] = inputs;
    return { type, name };
  }

  async ensureCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> { /* overwritten in subclasses */ }
  abstract getCommandMetadata(): Promise<Partial<CommandMetadata>>;
  abstract run(options: T): Promise<void>;
}

export async function generate(env: IonicEnvironment, inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
  try {
    const runner = await GenerateRunner.createFromProjectType(env, env.project.type);
    const opts = runner.createOptionsFromCommandLine(inputs, options);
    await runner.run(opts);
  } catch (e) {
    if (e instanceof RunnerException) {
      throw new FatalException(e.message);
    }

    throw e;
  }
}
