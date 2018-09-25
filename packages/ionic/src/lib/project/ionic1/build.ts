import { CommandLineInputs, CommandLineOptions, CommandMetadata, Ionic1BuildOptions } from '../../../definitions';
import { BUILD_SCRIPT, BuildCLI, BuildRunner, BuildRunnerDeps } from '../../build';

import { Ionic1Project } from './';

export interface Ionic1BuildRunnerDeps extends BuildRunnerDeps {
  readonly project: Ionic1Project;
}

export class Ionic1BuildRunner extends BuildRunner<Ionic1BuildOptions> {
  constructor(protected readonly e: Ionic1BuildRunnerDeps) {
    super();
  }

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
    const v1 = new Ionic1BuildCLI(this.e);
    await v1.build(options);
  }
}

class Ionic1BuildCLI extends BuildCLI<Ionic1BuildOptions> {
  readonly name = 'Ionic 1 Toolkit';
  readonly pkg = '@ionic/v1-toolkit';
  readonly program = 'ionic-v1';
  readonly prefix = 'v1';
  readonly script = BUILD_SCRIPT;

  protected async buildArgs(options: Ionic1BuildOptions): Promise<string[]> {
    const { pkgManagerArgs } = await import('../../utils/npm');

    if (this.resolvedProgram === this.program) {
      return ['build'];
    } else {
      const [ , ...pkgArgs ] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'run', script: this.script });
      return pkgArgs;
    }
  }
}
