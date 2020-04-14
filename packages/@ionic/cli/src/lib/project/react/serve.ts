import { CommandLineInputs, CommandLineOptions } from '@ionic/cli-framework';
import { stripAnsi } from '@ionic/cli-framework/utils/format';
import { findClosestOpenPort } from '@ionic/utils-network';

import { CommandMetadata, ReactServeOptions, ServeDetails } from '../../../definitions';
import { input, strong, weak } from '../../color';
import { BIND_ALL_ADDRESS, DEFAULT_ADDRESS, LOCAL_ADDRESSES, SERVE_SCRIPT, ServeCLI, ServeRunner, ServeRunnerDeps } from '../../serve';

export class ReactServeRunner extends ServeRunner<ReactServeOptions> {
  constructor(protected readonly e: ServeRunnerDeps) {
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
          name: 'https',
          summary: 'Use HTTPS for the dev server',
          type: Boolean,
          groups: ['cordova'],
          hint: weak('[react-scripts]'),
        },
        {
          name: 'react-editor',
          summary: `Specify the editor that opens files upon crash`,
          type: String,
          spec: { value: 'editor' },
          groups: ['cordova'],
          hint: weak('[react-scripts]'),
        },
        {
          name: 'ci',
          summary: `Treat warnings as build failures, test runner does not watch`,
          type: Boolean,
          groups: ['cordova'],
          hint: weak('[react-scripts]'),
        },
      ],
    };
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): ReactServeOptions {
    const baseOptions = super.createOptionsFromCommandLine(inputs, options);
    const ci = options['ci'] ? Boolean(options['ci']) : undefined;
    const https = options['https'] ? Boolean(options['https']) : undefined;
    const reactEditor = options['react-editor'] ? String(options['react-editor']) : undefined;

    return {
      ...baseOptions,
      ci,
      https,
      reactEditor,
    };
  }

  modifyOpenUrl(url: string, options: ReactServeOptions): string {
    return url;
  }

  async serveProject(options: ReactServeOptions): Promise<ServeDetails> {
    const [externalIP, availableInterfaces] = await this.selectExternalIP(options);

    const port = options.port = await findClosestOpenPort(options.port);

    const reactScripts = new ReactServeCLI(this.e);
    await reactScripts.serve(options);

    return {
      custom: reactScripts.resolvedProgram !== reactScripts.program,
      protocol: options.https ? 'https' : 'http',
      localAddress: 'localhost',
      externalAddress: externalIP,
      externalNetworkInterfaces: availableInterfaces,
      port,
      externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(externalIP),
    };
  }
}

export class ReactServeCLI extends ServeCLI<ReactServeOptions> {
  readonly name = 'React Scripts';
  readonly pkg = 'react-scripts';
  readonly program = 'react-scripts';
  readonly prefix = 'react-scripts';
  readonly script = SERVE_SCRIPT;
  protected chunks = 0;

  async serve(options: ReactServeOptions): Promise<void> {
    this.on('compile', chunks => {
      if (chunks > 0) {
        this.e.log.info(`... and ${strong(chunks.toString())} additional chunks`);
      }
    });

    return super.serve(options);
  }

  protected stdoutFilter(line: string): boolean {
    if (this.resolvedProgram !== this.program) {
      return super.stdoutFilter(line);
    }

    const strippedLine = stripAnsi(line);

    const compileMsgs = ['Compiled successfully', 'Compiled with warnings', 'Failed to compile'];
    if (compileMsgs.some(msg => strippedLine.includes(msg))) {
      this.emit('ready');
      return false;
    }

    if (strippedLine.match(/.*chunk\s{\d+}.+/)) {
      this.chunks++;
      return false;
    }

    if (strippedLine.includes('Compiled successfully')) {
      this.emit('compile', this.chunks);
      this.chunks = 0;
    }

    return true;
  }

  protected async buildArgs(options: ReactServeOptions): Promise<string[]> {
    const { pkgManagerArgs } = await import('../../utils/npm');

    if (this.resolvedProgram === this.program) {
      return ['start'];
    } else {
      const [, ...pkgArgs] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'run', script: this.script });
      return pkgArgs;
    }
  }

  protected async buildEnvVars(options: ReactServeOptions): Promise<NodeJS.ProcessEnv> {
    const env: NodeJS.ProcessEnv = {};

    // Tell CRA not to open the dev server URL. We do this in Ionic CLI.
    env.BROWSER = 'none';

    // CRA binds to `localhost` by default, but if specified it prints a
    // warning, so don't set `HOST` if the host is set to `localhost`.
    if (options.host !== DEFAULT_ADDRESS) {
      env.HOST = options.host;
    }

    env.PORT = String(options.port);
    env.HTTPS = options.https ? 'true' : 'false';

    if (options.ci) {
      env.CI = '1';
    }

    if (options.reactEditor) {
      env.REACT_EDITOR = options.reactEditor;
    }

    return { ...await super.buildEnvVars(options), ...env };
  }
}
