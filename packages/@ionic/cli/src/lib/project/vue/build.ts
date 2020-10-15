import { CommandLineInputs, CommandLineOptions, CommandMetadata, VueBuildOptions } from '../../../definitions';
import { BUILD_SCRIPT, BuildCLI, BuildRunner, BuildRunnerDeps } from '../../build';

import { VueProject } from './';

export interface VueBuildRunnerDeps extends BuildRunnerDeps {
  readonly project: VueProject;
}
export class VueBuildRunner extends BuildRunner<VueBuildOptions> {
  constructor(protected readonly e: VueBuildRunnerDeps) {
    super();
  }

  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {};
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): VueBuildOptions {
    const baseOptions = super.createBaseOptionsFromCommandLine(inputs, options);

    return {
      ...baseOptions,
      type: 'vue',
    };
  }

  async buildProject(options: VueBuildOptions): Promise<void> {
    const vueScripts = new VueBuildCLI(this.e);
    await vueScripts.build(options);
  }
}

export class VueBuildCLI extends BuildCLI<VueBuildOptions> {
  readonly name = 'Vue CLI Service';
  readonly pkg = '@vue/cli-service';
  readonly program = 'vue-cli-service';
  readonly prefix = 'vue-cli-service';
  readonly script = BUILD_SCRIPT;

  protected async buildArgs(options: VueBuildOptions): Promise<string[]> {
    const { pkgManagerArgs } = await import('../../utils/npm');

    if (this.resolvedProgram === this.program) {
      return ['build'];
    } else {
      const [ , ...pkgArgs ] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'run', script: this.script });
      return pkgArgs;
    }
  }

  protected async buildEnvVars(options: VueBuildOptions): Promise<NodeJS.ProcessEnv> {
    const env: NodeJS.ProcessEnv = {};
    return { ...await super.buildEnvVars(options), ...env };
  }
}
