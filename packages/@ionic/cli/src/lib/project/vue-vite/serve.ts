import { ParsedArgs, unparseArgs } from '@ionic/cli-framework';
import { stripAnsi } from '@ionic/cli-framework-output';
import { findClosestOpenPort } from '@ionic/utils-network';

import {
  CommandMetadata,
  ServeDetails,
  VueServeOptions,
} from '../../../definitions';
import { strong } from '../../color';
import {
  BIND_ALL_ADDRESS,
  DEFAULT_ADDRESS,
  LOCAL_ADDRESSES,
  SERVE_SCRIPT,
  ServeCLI,
  ServeRunner,
  ServeRunnerDeps,
} from '../../serve';

export class VueServeRunner extends ServeRunner<VueServeOptions> {
  constructor(protected readonly e: ServeRunnerDeps) {
    super();
  }

  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {};
  }

  modifyOpenUrl(url: string, _options: VueServeOptions): string {
    return url;
  }

  async serveProject(options: VueServeOptions): Promise<ServeDetails> {
    const [externalIP, availableInterfaces] = await this.selectExternalIP(
      options
    );

    const port = (options.port = await findClosestOpenPort(options.port));

    const vueScripts = new VueViteServeCLI(this.e);
    await vueScripts.serve(options);

    return {
      custom: vueScripts.resolvedProgram !== vueScripts.program,
      protocol: options.https ? 'https' : 'http',
      localAddress: 'localhost',
      externalAddress: externalIP,
      externalNetworkInterfaces: availableInterfaces,
      port,
      externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(
        externalIP
      ),
    };
  }
}

export class VueViteServeCLI extends ServeCLI<VueServeOptions> {
  readonly name = 'Vite CLI Service';
  readonly pkg = 'vite';
  readonly program = 'vite';
  readonly prefix = 'vite';
  readonly script = SERVE_SCRIPT;
  protected chunks = 0;

  async serve(options: VueServeOptions): Promise<void> {
    this.on('compile', (chunks) => {
      if (chunks > 0) {
        this.e.log.info(
          `... and ${strong(chunks.toString())} additional chunks`
        );
      }
    });

    return super.serve(options);
  }

  protected stdoutFilter(line: string): boolean {
    if (this.resolvedProgram !== this.program) {
      return super.stdoutFilter(line);
    }
    const strippedLine = stripAnsi(line);
    const compileMsgs = [
      'Compiled successfully',
      'Compiled with warnings',
      'Failed to compile',
      "ready in"
    ];
    if (compileMsgs.some((msg) => strippedLine.includes(msg))) {
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
  protected stderrFilter(line: string): boolean {
    if (this.resolvedProgram !== this.program) {
      return super.stderrFilter(line);
    }
    const strippedLine = stripAnsi(line);
    if (strippedLine.includes('webpack.Progress')) {
      return false;
    }

    return true;
  }

  protected async buildArgs(options: VueServeOptions): Promise<string[]> {
    const args: ParsedArgs = {
      _: [],
      host: options.host,
      port: options.port ? options.port.toString() : undefined,
    };
    const { pkgManagerArgs } = await import('../../utils/npm');

    const separatedArgs = options['--'];

    if (this.resolvedProgram === this.program) {
      return [...unparseArgs(args), ...separatedArgs];
    } else {
      const [, ...pkgArgs] = await pkgManagerArgs(
        this.e.config.get('npmClient'),
        {
          command: 'run',
          script: this.script,
          scriptArgs: [...unparseArgs(args), ...separatedArgs],
        }
      );
      return pkgArgs;
    }
  }

  protected async buildEnvVars(
    options: VueServeOptions
  ): Promise<NodeJS.ProcessEnv> {
    const env: NodeJS.ProcessEnv = {};
    // // Vue CLI binds to `localhost` by default, but if specified it prints a
    // // warning, so don't set `HOST` if the host is set to `localhost`.
    if (options.host !== DEFAULT_ADDRESS) {
      env.HOST = options.host;
    }

    env.PORT = String(options.port);

    env.HTTPS = options.https ? 'true' : 'false';

    return { ...(await super.buildEnvVars(options)), ...env };
  }
}
