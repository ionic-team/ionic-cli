import { PromptModule } from '@ionic/cli-framework';
import chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, GenerateOptions, IConfig, ILogger, IProject, IShell, IonicEnvironment, Runner } from '../definitions';

import { FatalException, RunnerException, RunnerNotFoundException } from './errors';
import { prettyProjectName } from './project';
import * as ζangularProjectGenerate from './project/angular/generate';
import * as ζionicAngularProjectGenerate from './project/ionic-angular/generate';

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

  static async createFromProject(env: IonicEnvironment): Promise<ζangularProjectGenerate.AngularGenerateRunner>;
  static async createFromProject(env: IonicEnvironment): Promise<ζionicAngularProjectGenerate.IonicAngularGenerateRunner>;
  static async createFromProject(env: IonicEnvironment): Promise<GenerateRunner<any>>;
  static async createFromProject(env: IonicEnvironment): Promise<GenerateRunner<any>> {
    if (env.project.type === 'angular') {
      const { AngularGenerateRunner } = await import('./project/angular/generate');
      return new AngularGenerateRunner(env);
    } else if (env.project.type === 'ionic-angular') {
      const { IonicAngularGenerateRunner } = await import('./project/ionic-angular/generate');
      return new IonicAngularGenerateRunner(env);
    } else {
      throw new RunnerNotFoundException(
        `Generators are not supported in this project type (${chalk.bold(prettyProjectName(env.project.type))}).` +
        (env.project.type === 'custom' ? `Since you're using the ${chalk.bold('custom')} project type, this command won't work. The Ionic CLI doesn't know how to generate components for custom projects.\n\n` : '')
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
    const runner = await GenerateRunner.createFromProject(env);
    const opts = runner.createOptionsFromCommandLine(inputs, options);
    await runner.run(opts);
  } catch (e) {
    if (e instanceof RunnerException) {
      throw new FatalException(e.message);
    }

    throw e;
  }
}
