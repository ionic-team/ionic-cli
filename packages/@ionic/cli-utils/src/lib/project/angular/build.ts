import { CommandGroup, OptionGroup, ParsedArgs, unparseArgs } from '@ionic/cli-framework';
import chalk from 'chalk';
import * as Debug from 'debug';

import { AngularBuildOptions, CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../../definitions';
import { BUILD_SCRIPT, BuildRunner, BuildRunnerDeps } from '../../build';

import { AngularProject } from './';

const debug = Debug('ionic:cli-utils:lib:project:angular:build');

export const NG_BUILD_OPTIONS = [
  {
    name: 'prod',
    summary: `Flag to set configuration to ${chalk.green('prod')}`,
    type: Boolean,
    hint: chalk.dim('[ng]'),
  },
  {
    name: 'configuration',
    aliases: ['c'],
    summary: 'Specify the configuration to use.',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: chalk.dim('[ng]'),
  },
];

export interface AngularBuildRunnerDeps extends BuildRunnerDeps {
  readonly project: AngularProject;
}

export class AngularBuildRunner extends BuildRunner<AngularBuildOptions> {
  readonly project: AngularProject;

  constructor(deps: AngularBuildRunnerDeps) {
    super(deps);
    this.project = deps.project;
  }

  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {
      groups: [CommandGroup.Experimental],
      exampleCommands: ['--prod'],
      description: `
${chalk.green('ionic build')} uses the Angular CLI. Use ${chalk.green('ng build --help')} to list all Angular CLI options for building your app. See the ${chalk.green('ng build')} docs${chalk.cyan('[1]')} for explanations. Options not listed below are considered advanced and can be passed to the ${chalk.green('ng')} CLI using the ${chalk.green('--')} separator after the Ionic CLI arguments. See the examples.

${chalk.cyan('[1]')}: ${chalk.bold('https://github.com/angular/angular-cli/wiki/build')}`,
      options: NG_BUILD_OPTIONS,
    };
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): AngularBuildOptions {
    const baseOptions = super.createBaseOptionsFromCommandLine(inputs, options);
    const prod = options['prod'] ? Boolean(options['prod']) : undefined;
    const configuration = options['configuration'] ? String(options['configuration']) : (prod ? 'production' : undefined);

    return {
      ...baseOptions,
      prod,
      configuration,
      type: 'angular',
    };
  }

  async buildOptionsToNgArgs(options: AngularBuildOptions): Promise<string[]> {
    const args: ParsedArgs = {
      _: [],
    };

    if (options.engine === 'cordova') {
      const integration = await this.project.getIntegration('cordova');
      args.platform = options.platform;
      args.cordovaBasePath = integration.root;
    }

    return [...unparseArgs(args), ...options['--']];
  }

  buildArchitectCommand(options: AngularBuildOptions): string[] {
    const cmd = options.engine === 'cordova' ? 'ionic-cordova-build' : 'build';

    return ['run', `${options.project}:${cmd}${options.configuration ? `:${options.configuration}` : ''}`];
  }

  async buildProject(options: AngularBuildOptions): Promise<void> {
    const { pkgManagerArgs } = await import('../../utils/npm');
    const config = await this.config.load();
    const { npmClient } = config;
    const pkg = await this.project.requirePackageJson();

    const args = await this.buildOptionsToNgArgs(options);
    const shellOptions = { cwd: this.project.directory };

    debug(`Looking for ${chalk.cyan(BUILD_SCRIPT)} npm script.`);

    if (pkg.scripts && pkg.scripts[BUILD_SCRIPT]) {
      debug(`Invoking ${chalk.cyan(BUILD_SCRIPT)} npm script.`);
      const [pkgManager, ...pkgArgs] = await pkgManagerArgs(npmClient, { command: 'run', script: BUILD_SCRIPT });
      await this.shell.run(pkgManager, pkgArgs, shellOptions);
    } else {
      await this.shell.run('ng', [...this.buildArchitectCommand(options), ...args], shellOptions);
    }
  }
}
