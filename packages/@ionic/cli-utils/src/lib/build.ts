import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';

import { BuildOptions, CommandLineInputs, CommandLineOptions, IonicEnvironment, ProjectType } from '../definitions';

import { FatalException } from './errors';
import { PROJECT_FILE } from './project';

import * as ionic1BuildLibType from './project/ionic1/build';
import * as ionicAngularBuildLibType from './project/ionic-angular/build';
import * as angularBuildLibType from './project/angular/build';

const debug = Debug('ionic:cli-utils:lib:build');

// npm script names
const npmPrefix = 'ionic';
export const BUILD_SCRIPT = `${npmPrefix}:build`;
const BUILD_BEFORE_SCRIPT = `${npmPrefix}:build:before`;
const BUILD_AFTER_SCRIPT = `${npmPrefix}:build:after`;

export abstract class BuildRunner<T extends BuildOptions> {
  constructor(protected env: IonicEnvironment) {}

  static async createFromProjectType(env: IonicEnvironment, type: 'ionic1'): Promise<ionic1BuildLibType.BuildRunner>;
  static async createFromProjectType(env: IonicEnvironment, type: 'ionic-angular'): Promise<ionicAngularBuildLibType.BuildRunner>;
  static async createFromProjectType(env: IonicEnvironment, type: 'angular'): Promise<angularBuildLibType.BuildRunner>;
  static async createFromProjectType(env: IonicEnvironment, type?: ProjectType): Promise<BuildRunner<any>>;
  static async createFromProjectType(env: IonicEnvironment, type?: ProjectType): Promise<BuildRunner<any>> {
    if (type === 'ionic1') {
      const { BuildRunner } = await import('./project/ionic1/build');
      return new BuildRunner(env);
    } else if (type === 'ionic-angular') {
      const { BuildRunner } = await import('./project/ionic-angular/build');
      return new BuildRunner(env);
    } else if (type === 'angular') {
      const { BuildRunner } = await import('./project/angular/build');
      return new BuildRunner(env);
    } else {
      throw new FatalException(
        `Cannot perform Ionic build for ${type ? '' : 'unknown '}project type${type ? `: ${chalk.bold(type)}` : ''}.\n` +
        (type === 'custom' ? `Since you're using the ${chalk.bold('custom')} project type, this command won't work. The Ionic CLI doesn't know how to build custom projects.\n\n` : '') +
        `If you'd like the CLI to try to detect your project type, you can unset the ${chalk.bold('type')} attribute in ${chalk.bold(PROJECT_FILE)}.`
      );
    }
  }

  abstract createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): T;

  createBaseOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): BuildOptions {
    const [ platform ] = inputs;

    return {
      target: options['target'] ? String(options['target']) : undefined,
      platform,
    };
  }

  abstract buildProject(options: T): Promise<void>;

  async invokeBeforeHook() {
    const { pkgManagerArgs } = await import('./utils/npm');

    const pkg = await this.env.project.loadPackageJson();
    const config = await this.env.config.load();
    const { npmClient } = config;

    debug(`Looking for ${chalk.cyan(BUILD_BEFORE_SCRIPT)} npm script.`);

    if (pkg.scripts && pkg.scripts[BUILD_BEFORE_SCRIPT]) {
      debug(`Invoking ${chalk.cyan(BUILD_BEFORE_SCRIPT)} npm script.`);
      const [ pkgManager, ...pkgArgs ] = await pkgManagerArgs({ npmClient, shell: this.env.shell }, { command: 'run', script: BUILD_BEFORE_SCRIPT });
      await this.env.shell.run(pkgManager, pkgArgs, {});
    }

    const deps = lodash.assign({}, pkg.dependencies, pkg.devDependencies);

    // TODO: move
    if (deps['@ionic/cli-plugin-cordova']) {
      const { checkCordova } = await import('./integrations/cordova/utils');
      await checkCordova(this.env);
    }
  }

  async invokeAfterHook(options: T) {
    const { pkgManagerArgs } = await import('./utils/npm');

    const pkg = await this.env.project.loadPackageJson();
    const config = await this.env.config.load();
    const { npmClient } = config;

    debug(`Looking for ${chalk.cyan(BUILD_AFTER_SCRIPT)} npm script.`);

    if (pkg.scripts && pkg.scripts[BUILD_AFTER_SCRIPT]) {
      debug(`Invoking ${chalk.cyan(BUILD_AFTER_SCRIPT)} npm script.`);
      const [ pkgManager, ...pkgArgs ] = await pkgManagerArgs({ npmClient, shell: this.env.shell }, { command: 'run', script: BUILD_AFTER_SCRIPT });
      await this.env.shell.run(pkgManager, pkgArgs, {});
    }
  }

  async run(options: T): Promise<void> {
    await this.invokeBeforeHook();
    await this.buildProject(options);
    await this.invokeAfterHook(options);
  }
}

export async function build(env: IonicEnvironment, inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
  const runner = await BuildRunner.createFromProjectType(env, env.project.type);
  const opts = runner.createOptionsFromCommandLine(inputs, options);
  await runner.run(opts);
}
