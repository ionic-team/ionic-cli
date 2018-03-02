import chalk from 'chalk';

import { BaseError } from '@ionic/cli-framework/lib/errors';

import { BaseBuildOptions, BuildOptions, CommandLineInputs, CommandLineOptions, CommandMetadata, IonicEnvironment, ProjectType } from '../definitions';
import { PROJECT_FILE } from '../constants';
import { FatalException, RunnerException, RunnerNotFoundException } from './errors';
import { Runner } from './runner';
import { Hook } from './hooks';

import * as ionic1BuildLibType from './project/ionic1/build';
import * as ionicAngularBuildLibType from './project/ionic-angular/build';
import * as angularBuildLibType from './project/angular/build';

export const BUILD_SCRIPT = 'ionic:build';

export abstract class BuildRunner<T extends BuildOptions<any>> extends Runner<T, void> {
  constructor(protected env: IonicEnvironment) {
    super();
  }

  static async createFromProjectType(env: IonicEnvironment, type: 'angular'): Promise<angularBuildLibType.BuildRunner>;
  static async createFromProjectType(env: IonicEnvironment, type: 'ionic-angular'): Promise<ionicAngularBuildLibType.BuildRunner>;
  static async createFromProjectType(env: IonicEnvironment, type: 'ionic1'): Promise<ionic1BuildLibType.BuildRunner>;
  static async createFromProjectType(env: IonicEnvironment, type?: ProjectType): Promise<BuildRunner<BuildOptions<any>>>;
  static async createFromProjectType(env: IonicEnvironment, type?: ProjectType): Promise<BuildRunner<BuildOptions<any>>> {
    if (type === 'angular') {
      const { BuildRunner } = await import('./project/angular/build');
      return new BuildRunner(env);
    } else if (type === 'ionic-angular') {
      const { BuildRunner } = await import('./project/ionic-angular/build');
      return new BuildRunner(env);
    } else if (type === 'ionic1') {
      const { BuildRunner } = await import('./project/ionic1/build');
      return new BuildRunner(env);
    } else {
      throw new RunnerNotFoundException(
        `Cannot perform build for ${type ? '' : 'unknown '}project type${type ? `: ${chalk.bold(type)}` : ''}.\n` +
        (type === 'custom' ? `Since you're using the ${chalk.bold('custom')} project type, this command won't work. The Ionic CLI doesn't know how to build custom projects.\n\n` : '') +
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

  async run(options: T): Promise<void> {
    const before = new BuildBeforeHook(this.env);

    try {
      await before.run({ name: before.name, build: options });
    } catch (e) {
      if (e instanceof BaseError) {
        throw new FatalException(e.message);
      }

      throw e;
    }

    await this.buildProject(options);

    const after = new BuildAfterHook(this.env);

    try {
      await after.run({ name: after.name, build: options });
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
    const runner = await BuildRunner.createFromProjectType(env, env.project.type);
    const opts = runner.createOptionsFromCommandLine(inputs, options);
    await runner.run(opts);
  } catch (e) {
    if (e instanceof RunnerException) {
      throw new FatalException(e.message);
    }

    throw e;
  }
}
