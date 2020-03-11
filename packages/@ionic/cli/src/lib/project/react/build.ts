import { CommandLineInputs, CommandLineOptions, CommandMetadata, ReactBuildOptions } from '../../../definitions';
import { BUILD_SCRIPT, BuildCLI, BuildRunner, BuildRunnerDeps } from '../../build';
import { input, weak } from '../../color';

import { ReactProject } from './';

export interface ReactBuildRunnerDeps extends BuildRunnerDeps {
  readonly project: ReactProject;
}

export class ReactBuildRunner extends BuildRunner<ReactBuildOptions> {
  constructor(protected readonly e: ReactBuildRunnerDeps) {
    super();
  }

  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {
      description: `
This command will convert options to the environment variables used by React Scripts. See the ${input('create-react-app')} docs[^cra-build-docs] for explanations.
      `,
      footnotes: [
        {
          id: 'cra-build-docs',
          url: 'https://facebook.github.io/create-react-app/docs/advanced-configuration',
        },
      ],
      options: [
        {
          name: 'public-url',
          summary: 'The URL at which the app will be served',
          groups: ['cordova'],
          spec: { value: 'url' },
          hint: weak('[react-scripts]'),
        },
        {
          name: 'ci',
          summary: `Treat warnings as build failures, test runner does not watch`,
          type: Boolean,
          groups: ['cordova'],
          hint: weak('[react-scripts]'),
        },
        {
          name: 'source-map',
          summary: 'Do not generate source maps',
          type: Boolean,
          groups: ['cordova'],
          default: true,
          hint: weak('[react-scripts]'),
        },
        {
          name: 'inline-runtime-chunk',
          summary: `Do not include the runtime script in ${input('index.html')} (import instead)`,
          type: Boolean,
          groups: ['cordova'],
          default: true,
          hint: weak('[react-scripts]'),
        },
      ],
    };
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): ReactBuildOptions {
    const baseOptions = super.createBaseOptionsFromCommandLine(inputs, options);
    const publicUrl = options['public-url'] ? String(options['public-url']) : undefined;
    const ci = options['ci'] ? Boolean(options['ci']) : undefined;
    const sourceMap = options['source-map'] ? Boolean(options['source-map']) : undefined;
    const inlineRuntimeChunk = options['inline-runtime-check'] ? Boolean(options['inline-runtime-check']) : undefined;

    return {
      ...baseOptions,
      type: 'react',
      publicUrl,
      ci,
      sourceMap,
      inlineRuntimeChunk,
    };
  }

  async buildProject(options: ReactBuildOptions): Promise<void> {
    const reactScripts = new ReactBuildCLI(this.e);
    await reactScripts.build(options);
  }
}

export class ReactBuildCLI extends BuildCLI<ReactBuildOptions> {
  readonly name = 'React Scripts';
  readonly pkg = 'react-scripts';
  readonly program = 'react-scripts';
  readonly prefix = 'react-scripts';
  readonly script = BUILD_SCRIPT;

  protected async buildArgs(options: ReactBuildOptions): Promise<string[]> {
    const { pkgManagerArgs } = await import('../../utils/npm');

    if (this.resolvedProgram === this.program) {
      return ['build'];
    } else {
      const [ , ...pkgArgs ] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'run', script: this.script });
      return pkgArgs;
    }
  }

  protected async buildEnvVars(options: ReactBuildOptions): Promise<NodeJS.ProcessEnv> {
    const env: NodeJS.ProcessEnv = {};

    if (options.publicUrl) {
      env.PUBLIC_URL = options.publicUrl;
    }

    if (options.ci) {
      env.CI = '1';
    }

    if (!options.sourceMap) {
      env.GENERATE_SOURCEMAP = 'false';
    }

    if (!options.inlineRuntimeChunk) {
      env.INLINE_RUNTIME_CHUNK = 'false';
    }

    return { ...await super.buildEnvVars(options), ...env };
  }
}
