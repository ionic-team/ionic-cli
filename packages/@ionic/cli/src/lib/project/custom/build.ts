import { BaseBuildOptions, CommandLineInputs, CommandLineOptions, CommandMetadata, CustomBuildOptions } from '../../../definitions';
import { BuildRunner, BuildRunnerDeps } from '../../build';
import { input, strong } from '../../color';
import { RunnerException } from '../../errors';

export class CustomBuildRunner extends BuildRunner<CustomBuildOptions> {
  constructor(protected readonly e: BuildRunnerDeps) {
    super();
  }

  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {};
  }

  async createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): Promise<CustomBuildOptions> {
    const baseOptions: BaseBuildOptions = await super.createBaseOptionsFromCommandLine(inputs, options);

    return {
      ...baseOptions,
      type: 'custom',
    };
  }

  async buildProject(options: CustomBuildOptions): Promise<void> {
    const cli = this.getPkgManagerBuildCLI();

    if (!await cli.resolveScript()) {
      throw new RunnerException(
        `Cannot perform build.\n` +
        `Since you're using the ${strong('custom')} project type, you must provide the ${input(cli.script)} npm script so the Ionic CLI can build your project.`
      );
    }

    await cli.build(options);
  }
}
