import { CommandLineInputs, CommandLineOptions, CommandMetadata, VueBuildOptions } from '../../../definitions';
import { BUILD_SCRIPT, BuildCLI, BuildRunner, BuildRunnerDeps } from '../../build';

import { VueViteProject } from './';

export interface VueBuildRunnerDeps extends BuildRunnerDeps {
  readonly project: VueViteProject;
}
export class VueViteBuildRunner extends BuildRunner<VueBuildOptions> {
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
    const vueScripts = new VueViteBuildCLI(this.e);
    await vueScripts.build(options);
  }
}

export class VueViteBuildCLI extends BuildCLI<VueBuildOptions> {
  readonly name = 'Vite CLI Service';
  readonly pkg = 'vite';
  readonly program = 'vite';
  readonly prefix = 'vite';
  readonly script = BUILD_SCRIPT;

  protected async buildArgs(options: VueBuildOptions): Promise<string[]> {
    const { pkgManagerArgs } = await import('../../utils/npm');

    if (this.resolvedProgram === this.program) {
      return ['build', ...(options['--'] || [])];
    } else {
      const [ , ...pkgArgs ] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'run', script: this.script, scriptArgs: options['--'] });
      return pkgArgs;
    }
  }

  protected async buildEnvVars(options: VueBuildOptions): Promise<NodeJS.ProcessEnv> {
    const env: NodeJS.ProcessEnv = {};
    return { ...await super.buildEnvVars(options), ...env };
  }
}
