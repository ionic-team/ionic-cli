import chalk from 'chalk';
import * as Debug from 'debug';
import { parsedArgsToArgv } from '@ionic/cli-framework';

import { BuildOptions as BaseBuildOptions, CommandLineInputs, CommandLineOptions } from '../../definitions';

import { BUILD_SCRIPT, BuildRunner as BaseBuildRunner } from '../build';

const debug = Debug('ionic:cli-utils:lib:ionic-angular:build');

export interface BuildOptions extends BaseBuildOptions {
  prod: boolean;
  aot: boolean;
  minifyjs: boolean;
  minifycss: boolean;
  optimizejs: boolean;
  target?: string;
  env?: string;
}

export class BuildRunner extends BaseBuildRunner<BuildOptions> {
  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): BuildOptions {
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

  async buildProject(options: BuildOptions): Promise<void> {
    const { pkgManagerArgs } = await import('../utils/npm');
    const pkg = await this.env.project.loadPackageJson();

    const appScriptsArgs = this.generateAppScriptsArgs(options);
    const shellOptions = { showExecution: true, cwd: this.env.project.directory, env: { FORCE_COLOR: chalk.enabled ? '1' : '0' } };

    debug(`Looking for ${chalk.cyan(BUILD_SCRIPT)} npm script.`);

    if (pkg.scripts && pkg.scripts[BUILD_SCRIPT]) {
      debug(`Invoking ${chalk.cyan(BUILD_SCRIPT)} npm script.`);
      const [ pkgManager, ...pkgArgs ] = await pkgManagerArgs(this.env, { command: 'run', script: BUILD_SCRIPT, scriptArgs: appScriptsArgs });
      await this.env.shell.run(pkgManager, pkgArgs, shellOptions);
    } else {
      await this.env.shell.run('ionic-app-scripts', ['build', ...appScriptsArgs], shellOptions);
    }
  }

  generateAppScriptsArgs(options: BuildOptions) {
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

    return parsedArgsToArgv(minimistArgs, { useEquals: false });
  }
}
