import chalk from 'chalk';
import * as Debug from 'debug';
import { unparseArgs } from '@ionic/cli-framework';

import { CommandLineInputs, CommandLineOptions, IonicAngularBuildOptions } from '../../../definitions';

import { BUILD_SCRIPT, BuildRunner as BaseBuildRunner } from '../../build';

const debug = Debug('ionic:cli-utils:lib:project:ionic-angular:build');

export class BuildRunner extends BaseBuildRunner<IonicAngularBuildOptions> {
  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): IonicAngularBuildOptions {
    return {
      prod: options['prod'] ? true : false,
      aot: options['aot'] ? true : false,
      minifyjs: options['minifyjs'] ? true : false,
      minifycss: options['minifycss'] ? true : false,
      optimizejs: options['optimizejs'] ? true : false,
      env: options['env'] ? String(options['env']) : undefined,
      ...this.createBaseOptionsFromCommandLine(inputs, options),
    };
  }

  async buildProject(options: IonicAngularBuildOptions): Promise<void> {
    const { pkgManagerArgs } = await import('../../utils/npm');
    const config = await this.env.config.load();
    const { npmClient } = config;
    const pkg = await this.env.project.loadPackageJson();

    const appScriptsArgs = this.generateAppScriptsArgs(options);
    const shellOptions = { cwd: this.env.project.directory, env: { FORCE_COLOR: chalk.enabled ? '1' : '0' } };

    debug(`Looking for ${chalk.cyan(BUILD_SCRIPT)} npm script.`);

    if (pkg.scripts && pkg.scripts[BUILD_SCRIPT]) {
      debug(`Invoking ${chalk.cyan(BUILD_SCRIPT)} npm script.`);
      const [ pkgManager, ...pkgArgs ] = await pkgManagerArgs({ npmClient, shell: this.env.shell }, { command: 'run', script: BUILD_SCRIPT, scriptArgs: appScriptsArgs });
      await this.env.shell.run(pkgManager, pkgArgs, shellOptions);
    } else {
      await this.env.shell.run('ionic-app-scripts', ['build', ...appScriptsArgs], shellOptions);
    }
  }

  generateAppScriptsArgs(options: IonicAngularBuildOptions) {
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

    return unparseArgs(minimistArgs, { useEquals: false });
  }
}
