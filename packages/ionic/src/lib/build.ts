import { BaseError, ERROR_SHELL_COMMAND_NOT_FOUND, OptionGroup, PromptModule, ShellCommandError } from '@ionic/cli-framework';
import chalk from 'chalk';
import * as Debug from 'debug';

import { BaseBuildOptions, BuildOptions, CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataOption, IConfig, ILogger, IProject, IShell, Runner } from '../definitions';

import { BuildCLIProgramNotFoundException, FatalException, RunnerException } from './errors';
import { Hook } from './hooks';

const debug = Debug('ionic:lib:build');

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
  readonly prompt: PromptModule;
  readonly shell: IShell;
}

export abstract class BuildRunner<T extends BuildOptions<any>> implements Runner<T, void> {

  protected abstract readonly e: BuildRunnerDeps;

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
    const hook = new BuildBeforeHook(this.e);

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
      this.e.log.warn(`Cordova engine chosen without a target platform. This could cause issues. Please use the ${chalk.green('--platform')} option.`);
    }

    await this.beforeBuild(options);
    await this.buildProject(options);
    await this.afterBuild(options);
  }

  async afterBuild(options: T): Promise<void> {
    const hook = new BuildAfterHook(this.e);

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

export abstract class BuildCLI<T extends object> {

  /**
   * The pretty name of this Build CLI.
   */
  abstract readonly name: string;

  /**
   * The npm package of this Build CLI.
   */
  abstract readonly pkg: string;

  /**
   * The bin program to use for this Build CLI.
   */
  abstract readonly program: string;

  /**
   * If specified, `package.json` is inspected for this script to use instead
   * of `program`.
   */
  abstract readonly script?: string;

  private _resolvedProgram?: string;

  constructor(protected readonly e: BuildRunnerDeps) {}

  get resolvedProgram() {
    if (this._resolvedProgram) {
      return this._resolvedProgram;
    }

    return this.program;
  }

  /**
   * Build the arguments for starting this Build CLI. Called by `this.run()`.
   */
  protected abstract buildArgs(options: T): Promise<string[]>;

  async build(options: T): Promise<void> {
    this._resolvedProgram = await this.resolveProgram();

    await this.runWrapper(options);
  }

  protected async runWrapper(options: T): Promise<void> {
    try {
      return await this.run(options);
    } catch (e) {
      if (!(e instanceof BuildCLIProgramNotFoundException)) {
        throw e;
      }

      this.e.log.nl();
      this.e.log.info(
        `Looks like ${chalk.green(this.pkg)} isn't installed in this project.\n` +
        `This package is required for this command to work properly.`
      );

      const installed = await this.promptToInstall();

      if (!installed) {
        this.e.log.nl();
        throw new FatalException(`${chalk.green(this.pkg)} is required for this command to work properly.`);
      }

      return this.run(options);
    }
  }

  protected async run(options: T): Promise<void> {
    const args = await this.buildArgs(options);

    try {
      await this.e.shell.run(this.resolvedProgram, args, { cwd: this.e.project.directory, fatalOnNotFound: false });
    } catch (e) {
      if (e instanceof ShellCommandError && e.code === ERROR_SHELL_COMMAND_NOT_FOUND) {
        throw new BuildCLIProgramNotFoundException(`${chalk.bold(this.resolvedProgram)} command not found.`);
      }

      throw e;
    }
  }

  protected async resolveProgram(): Promise<string> {
    if (typeof this.script !== 'undefined') {
      debug(`Looking for ${chalk.cyan(this.script)} npm script.`);

      const pkg = await this.e.project.requirePackageJson();

      if (pkg.scripts && pkg.scripts[this.script]) {
        debug(`Using ${chalk.cyan(this.script)} npm script.`);
        return this.e.config.get('npmClient');
      }
    }

    return this.program;
  }

  protected async promptToInstall(): Promise<boolean> {
    const { pkgManagerArgs } = await import('./utils/npm');
    const [ manager, ...managerArgs ] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'install', pkg: this.pkg, saveDev: true, saveExact: true });

    this.e.log.nl();

    const confirm = await this.e.prompt({
      name: 'confirm',
      message: `Install ${chalk.green(this.pkg)}?`,
      type: 'confirm',
    });

    if (!confirm) {
      this.e.log.warn(`Not installing--here's how to install manually: ${chalk.green(`${manager} ${managerArgs.join(' ')}`)}`);
      return false;
    }

    await this.e.shell.run(manager, managerArgs, { cwd: this.e.project.directory });

    return true;
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
