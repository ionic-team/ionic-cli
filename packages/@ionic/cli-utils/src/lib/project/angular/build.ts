import { ParsedArgs, unparseArgs } from '@ionic/cli-framework';
import chalk from 'chalk';
import * as Debug from 'debug';
import { CommandGroup, OptionGroup } from '../../../constants';

import { AngularBuildOptions, CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../../definitions';
import { BUILD_SCRIPT, BuildRunner as BaseBuildRunner } from '../../build';
import { addCordovaEngineForAngular, removeCordovaEngineForAngular } from './utils';

const debug = Debug('ionic:cli-utils:lib:project:angular:build');

// tslint:disable no-null-keyword
export const NG_BUILD_OPTIONS = [
  {
    name: 'prod',
    summary: `Flag to set configuration to ${chalk.green('prod')}`,
    type: Boolean,
    hint: 'ng',
  },
  {
    name: 'project',
    summary: 'The name of the project',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
  {
    name: 'configuration',
    aliases: ['c'],
    summary: 'Specify the configuration to use.',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: 'ng',
  },
];
// tslint:enable no-null-keyword

export class BuildRunner extends BaseBuildRunner<AngularBuildOptions> {
  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {
      groups: [CommandGroup.Experimental],
      exampleCommands: ['--prod', '-- --extract-css=true'],
      description: `
${chalk.green('ionic build')} uses the Angular CLI. Use ${chalk.green('ng build --help')} to list all Angular CLI options for building your app. See the ${chalk.green('ng build')} docs${chalk.cyan('[1]')} for explanations. Options not listed below are considered advanced and can be passed to the ${chalk.green('ng')} CLI using the ${chalk.green('--')} separator after the Ionic CLI arguments. See the examples.

${chalk.cyan('[1]')}: ${chalk.bold('https://github.com/angular/angular-cli/wiki/build')}`,
      options: NG_BUILD_OPTIONS,
    };
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): AngularBuildOptions {
    const baseOptions = super.createBaseOptionsFromCommandLine(inputs, options);
    const prod = options['prod'] ? Boolean(options['prod']) : undefined;
    const project = options['project'] ? String(options['project']) : undefined;
    const configuration = options['configuration'] ? String(options['configuration']) : undefined;

    return {
      ...baseOptions,
      prod,
      project,
      configuration,
      type: 'angular',
    };
  }

  async buildOptionsToNgArgs(options: AngularBuildOptions): Promise<string[]> {
    const args: ParsedArgs = {
      _: [],
      prod: options.prod,
      project: options.project,
      configuration: options.configuration,
    };

    if (options.engine === 'cordova') {
      args['output-path'] = 'www';
    }

    // TODO: This is pretty hacky. Is there a better solution?
    if (options.engine === 'cordova' && options.platform === 'android') {
      if (!args['base-href'] && !options['--'].find(o => o.startsWith('--base-href'))) {
        args['base-href'] = 'file:///android_asset/www/';
      }
    }

    return [...unparseArgs(args, {}), ...options['--']];
  }

  async beforeBuild(options: AngularBuildOptions): Promise<void> {

    await super.beforeBuild(options);

    const p = await this.project.load();

    if (p.integrations.cordova && p.integrations.cordova.enabled !== false && options.engine === 'cordova' && options.platform) {
      await addCordovaEngineForAngular(this.project, options.platform, options.project);
    }
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
      const [ pkgManager, ...pkgArgs ] = await pkgManagerArgs(npmClient, { command: 'run', script: BUILD_SCRIPT });
      await this.shell.run(pkgManager, pkgArgs, shellOptions);
    } else {
      await this.shell.run('ng', ['build', ...args], shellOptions);
    }
  }

  async afterBuild(options: AngularBuildOptions): Promise<void> {
    const p = await this.project.load();

    if (p.integrations.cordova && p.integrations.cordova.enabled !== false && options.engine === 'cordova' && options.platform) {
      await removeCordovaEngineForAngular(this.project, options.platform, options.project);
    }

    await super.afterBuild(options);
  }
}
