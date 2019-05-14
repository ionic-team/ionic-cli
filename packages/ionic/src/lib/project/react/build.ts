import { MetadataGroup } from '@ionic/cli-framework';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, ReactBuildOptions } from '../../../definitions';
import { BUILD_SCRIPT, BuildCLI, BuildRunner, BuildRunnerDeps } from '../../build';
import { input } from '../../color';

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
    ${input('ionic build')} uses React Scripts. See the ${input('create-react-app')} docs[^cra-build-docs] for explanations. This command interprets the arguments to environment variables supported by React Scripts.
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
          summary: `You may use this variable to force assets to be referenced verbatim to the url you provide (hostname included). `,
          type: String,
        },
        {
          name: 'ci',
          summary: `Treat all warnings as build failures. Also makes the test runner non-watching.`,
          type: Boolean,
        },
        {
          name: 'source-map',
          summary: `When set to false, source maps are not generated.`,
          type: Boolean,
        },
        {
          name: 'inline-runtime-chunk',
          summary: `By default a runtime script is included in index.html. When set to false, the script will not be embedded and will be imported as usual. This is normally required when dealing with CSP.`,
          type: Boolean,
        },
      ],
      groups: [MetadataGroup.BETA],
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
    const envVars: NodeJS.ProcessEnv = {};

    if (options.publicUrl) {
      envVars.PUBLIC_URL = options.publicUrl;
    }
    envVars.CI = String(options.ci);
    envVars.GENERATE_SOURCEMAP = String(options.sourceMap);
    envVars.INLINE_RUNTIME_CHUNK = String(options.inlineRuntimeChunk);

    return envVars;
  }
}
