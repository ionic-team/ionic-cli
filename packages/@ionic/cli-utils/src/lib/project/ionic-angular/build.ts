import chalk from 'chalk';
import * as Debug from 'debug';
import { unparseArgs } from '@ionic/cli-framework';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, IonicAngularBuildOptions } from '../../../definitions';

import { BUILD_SCRIPT, BuildRunner as BaseBuildRunner } from '../../build';
import { APP_SCRIPTS_OPTIONS } from './app-scripts';

const debug = Debug('ionic:cli-utils:lib:project:ionic-angular:build');

export class BuildRunner extends BaseBuildRunner<IonicAngularBuildOptions> {
  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {
      exampleCommands: ['--prod', '-- --generateSourceMap false'],
      longDescription: `${chalk.green('ionic build')} uses ${chalk.bold('@ionic/app-scripts')}. See the project's ${chalk.bold('README.md')}${chalk.cyan('[1]')} for documentation. Options not listed below are considered advanced and can be passed to the ${chalk.green('ionic-app-scripts')} CLI using the ${chalk.green('--')} separator after the Ionic CLI arguments. See the examples.

${chalk.cyan('[1]')}: ${chalk.bold('https://github.com/ionic-team/ionic-app-scripts/blob/master/README.md')}`,
      options: APP_SCRIPTS_OPTIONS,
    };
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): IonicAngularBuildOptions {
    const baseOptions = super.createOptionsFromCommandLine(inputs, options);

    return {
      ...baseOptions,
      prod: options['prod'] ? true : false,
      aot: options['aot'] ? true : false,
      minifyjs: options['minifyjs'] ? true : false,
      minifycss: options['minifycss'] ? true : false,
      optimizejs: options['optimizejs'] ? true : false,
      env: options['env'] ? String(options['env']) : undefined,
    };
  }

  async buildProject(options: IonicAngularBuildOptions): Promise<void> {
    const { pkgManagerArgs } = await import('../../utils/npm');
    const config = await this.env.config.load();
    const { npmClient } = config;
    const pkg = await this.env.project.loadPackageJson();

    const appScriptsArgs = this.generateAppScriptsArgs(options);
    const shellOptions = { cwd: this.env.project.directory, env: { FORCE_COLOR: chalk.enabled ? '1' : '0', ...process.env } };

    debug(`Looking for ${chalk.cyan(BUILD_SCRIPT)} npm script.`);

    if (pkg.scripts && pkg.scripts[BUILD_SCRIPT]) {
      debug(`Invoking ${chalk.cyan(BUILD_SCRIPT)} npm script.`);
      const [ pkgManager, ...pkgArgs ] = await pkgManagerArgs({ npmClient, shell: this.env.shell }, { command: 'run', script: BUILD_SCRIPT, scriptArgs: appScriptsArgs });
      await this.env.shell.run(pkgManager, pkgArgs, shellOptions);
    } else {
      await this.env.shell.run('ionic-app-scripts', ['build', ...appScriptsArgs], shellOptions);
    }
  }

  generateAppScriptsArgs(options: IonicAngularBuildOptions): string[] {
    const minimistArgs = {
      _: [],
      prod: options.prod ? true : false,
      aot: options.aot ? true : false,
      minifyjs: options.minifyjs ? true : false,
      minifycss: options.minifycss ? true : false,
      optimizejs: options.optimizejs ? true : false,
      target: options.target,
      platform: options.platform,
      env: options.env,
    };

    return [...unparseArgs(minimistArgs, { useEquals: false }), ...options['--']];
  }
}
