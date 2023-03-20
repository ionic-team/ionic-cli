import { CommandLineInputs, CommandLineOptions, CommandMetadata, ReactBuildOptions } from '../../../definitions';
import { BUILD_SCRIPT, BuildCLI, BuildRunner, BuildRunnerDeps } from '../../build';

import { ReactViteProject } from './';

export interface ReactViteBuildRunnerDeps extends BuildRunnerDeps {
  readonly project: ReactViteProject;
}
export class ReactViteBuildRunner extends BuildRunner<ReactBuildOptions> {
  constructor(protected readonly e: ReactViteBuildRunnerDeps) {
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
    const reactVite = new ReactViteBuildCLI(this.e);
    await reactVite.build(options);
  }
}

export class ReactViteBuildCLI extends BuildCLI<ReactBuildOptions> {
  readonly name = 'Vite CLI Service';
  readonly pkg = 'vite';
  readonly program = 'vite';
  readonly prefix = 'vite';
  readonly script = BUILD_SCRIPT;

  protected async buildArgs(options: ReactBuildOptions): Promise<string[]> {
    const { pkgManagerArgs } = await import('../../utils/npm');

    if (this.resolvedProgram === this.program) {
      return ['build', ...(options['--'] || [])];
    } else {
      const [ , ...pkgArgs ] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'run', script: this.script, scriptArgs: options['--'] });
      return pkgArgs;
    }
  }

  protected async buildEnvVars(options: ReactBuildOptions): Promise<NodeJS.ProcessEnv> {
    const env: NodeJS.ProcessEnv = {};
    return { ...await super.buildEnvVars(options), ...env };
  }
}
