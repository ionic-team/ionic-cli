import chalk from 'chalk';

import { BaseError } from '@ionic/cli-framework';

import { BaseBuildOptions, BuildOptions, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataOption, IConfig, ILogger, IProject, IShell, IonicEnvironment, Runner } from '../definitions';
import { PROJECT_FILE } from '../constants';
import { FatalException, RunnerException, RunnerNotFoundException } from './errors';
import { Hook } from './hooks';

import * as ζprojectAngular from './project/angular';
import * as ζprojectAngularBuild from './project/angular/build';
import * as ζprojectIonicAngular from './project/ionic-angular';
import * as ζprojectIonicAngularBuild from './project/ionic-angular/build';
import * as ζprojectIonic1 from './project/ionic1';
import * as ζprojectIonic1Build from './project/ionic1/build';

export const BUILD_SCRIPT = 'ionic:build';

export const COMMON_BUILD_COMMAND_OPTIONS: ReadonlyArray<CommandMetadataOption> = [
  {
    name: 'engine',
    summary: `Target engine (e.g. ${['browser', 'cordova'].map(e => chalk.green(e)).join(', ')})`,
    default: 'browser',
  },
  {
    name: 'platform',
    summary: `Target platform on chosen engine (e.g. ${['ios', 'android'].map(e => chalk.green(e)).join(', ')})`,
  },
];

export interface BuildRunnerDeps {
  readonly config: IConfig;
  readonly log: ILogger;
  readonly shell: IShell;
}

export abstract class BuildRunner<T extends BuildOptions<any>> implements Runner<T, void> {
  protected readonly config: IConfig;
  protected readonly log: ILogger;
  protected readonly shell: IShell;

  protected abstract readonly project: IProject;

  constructor({ config, log, shell }: BuildRunnerDeps) {
    this.config = config;
    this.log = log;
    this.shell = shell;
  }

  static async createFromProject(deps: BuildRunnerDeps, project: ζprojectAngular.AngularProject): Promise<ζprojectAngularBuild.AngularBuildRunner>;
  static async createFromProject(deps: BuildRunnerDeps, project: ζprojectIonicAngular.IonicAngularProject): Promise<ζprojectIonicAngularBuild.IonicAngularBuildRunner>;
  static async createFromProject(deps: BuildRunnerDeps, project: ζprojectIonic1.Ionic1Project): Promise<ζprojectIonic1Build.Ionic1BuildRunner>;
  static async createFromProject(deps: BuildRunnerDeps, project: IProject): Promise<BuildRunner<any>>;
  static async createFromProject(deps: BuildRunnerDeps, project: ζprojectAngular.AngularProject | ζprojectIonicAngular.IonicAngularProject | ζprojectIonic1.Ionic1Project | IProject): Promise<BuildRunner<any>> {
    // TODO: fix casts

    if (project.type === 'angular') {
      const { AngularBuildRunner } = await import('./project/angular/build');
      return new AngularBuildRunner({ ...deps, project: <ζprojectAngular.AngularProject>project });
    } else if (project.type === 'ionic-angular') {
      const { IonicAngularBuildRunner } = await import('./project/ionic-angular/build');
      return new IonicAngularBuildRunner({ ...deps, project: <ζprojectIonicAngular.IonicAngularProject>project });
    } else if (project.type === 'ionic1') {
      const { Ionic1BuildRunner } = await import('./project/ionic1/build');
      return new Ionic1BuildRunner({ ...deps, project: <ζprojectIonic1.Ionic1Project>project });
    } else {
      throw new RunnerNotFoundException(
        `Cannot perform build for ${project.type ? '' : 'unknown '}project type${project.type ? `: ${chalk.bold(project.type)}` : ''}.\n` +
        (project.type === 'custom' ? `Since you're using the ${chalk.bold('custom')} project type, this command won't work. The Ionic CLI doesn't know how to build custom projects.\n\n` : '') +
        `If you'd like the CLI to try to detect your project type, you can unset the ${chalk.bold('type')} attribute in ${chalk.bold(PROJECT_FILE)}.`
      );
    }
  }

  abstract getCommandMetadata(): Promise<Partial<CommandMetadata>>;
  abstract createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): T;
  abstract buildProject(options: T): Promise<void>;

  createBaseOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): BaseBuildOptions {
    const separatedArgs = options['--'];
    const platform = options['platform'] ? String(options['platform']) : undefined;
    const engine = options['engine'] ? String(options['engine']) : 'browser';

    return { '--': separatedArgs ? separatedArgs : [], engine, platform };
  }

  async beforeBuild(options: T): Promise<void> {
    const hook = new BuildBeforeHook({ config: this.config, project: this.project, shell: this.shell });

    try {
      await hook.run({ name: hook.name, build: options });
    } catch (e) {
      if (e instanceof BaseError) {
        throw new FatalException(e.message);
      }

      throw e;
    }
  }

  async run(options: T): Promise<void> {
    if (options.engine === 'cordova' && !options.platform) {
      this.log.warn(`Cordova engine chosen without a target platform. This could cause issues. Please use the ${chalk.green('--platform')} option.`);
    }

    await this.beforeBuild(options);
    await this.buildProject(options);
    await this.afterBuild(options);
  }

  async afterBuild(options: T): Promise<void> {
    const hook = new BuildAfterHook({ config: this.config, project: this.project, shell: this.shell });

    try {
      await hook.run({ name: hook.name, build: options });
    } catch (e) {
      if (e instanceof BaseError) {
        throw new FatalException(e.message);
      }

      throw e;
    }
  }
}

class BuildBeforeHook extends Hook {
  readonly name = 'build:before';
}

class BuildAfterHook extends Hook {
  readonly name = 'build:after';
}

export async function build(env: IonicEnvironment, inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
  try {
    const runner = await BuildRunner.createFromProject(env, env.project);
    const opts = runner.createOptionsFromCommandLine(inputs, options);
    await runner.run(opts);
  } catch (e) {
    if (e instanceof RunnerException) {
      throw new FatalException(e.message);
    }

    throw e;
  }
}
