import chalk from 'chalk';
import * as Debug from 'debug';

import { ParsedArgs, unparseArgs } from '@ionic/cli-framework';

import { AngularBuildOptions, CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../../definitions';
import { OptionGroup } from '../../../constants';

import { BUILD_SCRIPT, BuildRunner as BaseBuildRunner } from '../../build';

const debug = Debug('ionic:cli-utils:lib:project:angular:build');

export class BuildRunner extends BaseBuildRunner<AngularBuildOptions> {
  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {
      exampleCommands: ['--prod', '-- --extract-css=true'],
      longDescription: `
${chalk.green('ionic build')} uses the Angular CLI. Use ${chalk.green('ng build --help')} to list all Angular CLI options for building your app. See the ${chalk.green('ng build')} docs${chalk.cyan('[1]')} for explanations. Options not listed below are considered advanced and can be passed to the ${chalk.green('ng')} CLI using the ${chalk.green('--')} separator after the Ionic CLI arguments. See the examples.

${chalk.cyan('[1]')}: ${chalk.bold('https://github.com/angular/angular-cli/wiki/build#ng-build')}`,
      options: [
        {
          name: 'dev',
          description: `Sets the build target to ${chalk.green('development')}`,
          type: Boolean,
          hint: 'ng',
        },
        {
          name: 'prod',
          description: `Sets the build target to ${chalk.green('production')}`,
          type: Boolean,
          hint: 'ng',
        },
        {
          name: 'target',
          description: 'Set the build target to a custom value',
          aliases: ['t'],
          groups: [OptionGroup.Advanced],
          hint: 'ng',
        },
        {
          name: 'environment',
          description: 'Set the build environment to a custom value',
          aliases: ['e'],
          groups: [OptionGroup.Advanced],
          hint: 'ng',
        },
      ],
    };
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): AngularBuildOptions {
    const baseOptions = super.createBaseOptionsFromCommandLine(inputs, options);
    let target = options['target'] ? String(options['target']) : undefined;
    const environment = options['environment'] ? String(options['environment']) : undefined;

    if (!target) {
      if (options['dev']) {
        target = 'development';
      } else if (options['prod']) {
        target = 'production';
      }
    }

    return {
      ...baseOptions,
      type: 'angular',
      target,
      environment,
    };
  }

  async buildOptionsToNgArgs(options: AngularBuildOptions): Promise<string[]> {
    const args: ParsedArgs = {
      _: [],
      environment: options.environment,
    };

    if (options.target === 'development') {
      args['dev'] = true;
    } else if (options.target === 'production') {
      args['prod'] = true;
    } else {
      args['target'] = options.target;
    }

    return [...unparseArgs(args, {}), ...options['--']];
  }

  async buildProject(options: AngularBuildOptions): Promise<void> {
    const { pkgManagerArgs } = await import('../../utils/npm');
    const config = await this.config.load();
    const { npmClient } = config;
    const pkg = await this.project.loadPackageJson();

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
}
