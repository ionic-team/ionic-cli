import chalk from 'chalk';
import * as Debug from 'debug';

import { BuildOptions, CommandLineInputs, CommandLineOptions } from '../../../definitions';

import { BUILD_SCRIPT, BuildRunner as BaseBuildRunner } from '../../build';

const debug = Debug('ionic:cli-utils:lib:project:ionic1:build');

export class BuildRunner extends BaseBuildRunner<BuildOptions> {
  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions) {
    return {
      platform: options['platform'] ? String(options['platform']) : undefined,
    };
  }

  async buildProject(options: BuildOptions): Promise<void> {
    const { pkgManagerArgs } = await import('../../utils/npm');
    const config = await this.env.config.load();
    const { npmClient } = config;
    const pkg = await this.env.project.loadPackageJson();
    const shellOptions = { cwd: this.env.project.directory, env: { FORCE_COLOR: chalk.enabled ? '1' : '0' } };

    debug(`Looking for ${chalk.cyan(BUILD_SCRIPT)} npm script.`);

    if (pkg.scripts && pkg.scripts[BUILD_SCRIPT]) {
      debug(`Invoking ${chalk.cyan(BUILD_SCRIPT)} npm script.`);
      const [ pkgManager, ...pkgArgs ] = await pkgManagerArgs({ npmClient, shell: this.env.shell }, { command: 'run', script: BUILD_SCRIPT });
      await this.env.shell.run(pkgManager, pkgArgs, shellOptions);
    } else {
      await this.env.shell.run('ionic-v1', ['build'], shellOptions);
    }
  }
}
