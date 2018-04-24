import chalk from 'chalk';
import * as Debug from 'debug';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, Ionic1BuildOptions } from '../../../definitions';

import { BUILD_SCRIPT, BuildRunner as BaseBuildRunner } from '../../build';

const debug = Debug('ionic:cli-utils:lib:project:ionic1:build');

export class BuildRunner extends BaseBuildRunner<Ionic1BuildOptions> {
  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {};
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): Ionic1BuildOptions {
    const baseOptions = super.createBaseOptionsFromCommandLine(inputs, options);

    return {
      ...baseOptions,
      type: 'ionic1',
    };
  }

  async buildProject(options: Ionic1BuildOptions): Promise<void> {
    const { pkgManagerArgs } = await import('../../utils/npm');
    const config = await this.config.load();
    const { npmClient } = config;
    const pkg = await this.project.requirePackageJson();
    const shellOptions = { cwd: this.project.directory };

    debug(`Looking for ${chalk.cyan(BUILD_SCRIPT)} npm script.`);

    if (pkg.scripts && pkg.scripts[BUILD_SCRIPT]) {
      debug(`Invoking ${chalk.cyan(BUILD_SCRIPT)} npm script.`);
      const [ pkgManager, ...pkgArgs ] = await pkgManagerArgs(npmClient, { command: 'run', script: BUILD_SCRIPT });
      await this.shell.run(pkgManager, pkgArgs, shellOptions);
    } else {
      await this.shell.run('ionic-v1', ['build'], shellOptions);
    }
  }
}
