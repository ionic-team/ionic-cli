import { BaseError, OptionGroup } from '@ionic/cli-framework';
import chalk from 'chalk';

import { BaseBuildOptions, BuildOptions, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataOption, IConfig, ILogger, IProject, IShell, Runner } from '../definitions';

import { FatalException, RunnerException } from './errors';
import { Hook } from './hooks';

export const BUILD_SCRIPT = 'ionic:build';

export const COMMON_BUILD_COMMAND_OPTIONS: ReadonlyArray<CommandMetadataOption> = [
  {
    name: 'engine',
    summary: `Target engine (e.g. ${['browser', 'cordova'].map(e => chalk.green(e)).join(', ')})`,
    groups: [OptionGroup.Advanced],
  },
  {
    name: 'platform',
    summary: `Target platform on chosen engine (e.g. ${['ios', 'android'].map(e => chalk.green(e)).join(', ')})`,
    groups: [OptionGroup.Advanced],
  },
];

export interface BuildRunnerDeps {
  readonly config: IConfig;
  readonly log: ILogger;
  readonly project: IProject;
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

  abstract getCommandMetadata(): Promise<Partial<CommandMetadata>>;
  abstract createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): T;
  abstract buildProject(options: T): Promise<void>;

  createBaseOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): BaseBuildOptions {
    const separatedArgs = options['--'];
    const platform = options['platform'] ? String(options['platform']) : undefined;
    const engine = this.determineEngineFromCommandLine(options);
    const project = options['project'] ? String(options['project']) : undefined;

    return { '--': separatedArgs ? separatedArgs : [], engine, platform, project };
  }

  determineEngineFromCommandLine(options: CommandLineOptions): string {
    if (options['engine']) {
      return String(options['engine']);
    }

    if (options['cordova']) {
      return 'cordova';
    }

    return 'browser';
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

export async function build(deps: BuildRunnerDeps, inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
  try {
    const runner = await deps.project.requireBuildRunner();

    if (deps.project.name) {
      options['project'] = deps.project.name;
    }

    const opts = runner.createOptionsFromCommandLine(inputs, options);
    await runner.run(opts);
  } catch (e) {
    if (e instanceof RunnerException) {
      throw new FatalException(e.message);
    }

    throw e;
  }
}
