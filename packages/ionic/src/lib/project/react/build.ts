import chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, ReactBuildOptions } from '../../../definitions';
import { BuildRunner, BuildRunnerDeps } from '../../build';
import { RunnerException } from '../../errors';

export class ReactBuildRunner extends BuildRunner<ReactBuildOptions> {
  constructor(protected readonly e: BuildRunnerDeps) {
    super();
  }

  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {};
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): ReactBuildOptions {
    const baseOptions = super.createBaseOptionsFromCommandLine(inputs, options);

    return {
      ...baseOptions,
      type: 'react',
    };
  }

  async buildProject(options: ReactBuildOptions): Promise<void> {
    const cli = this.getPkgManagerBuildCLI();

    if (!await cli.resolveScript()) {
      throw new RunnerException(
        `Cannot perform build.\n` +
        `Since you're using the ${chalk.bold('React')} project type, you must provide the ${chalk.green(cli.script)} npm script so the Ionic CLI can build your project.`
      );
    }

    await cli.build(options);
  }
}
