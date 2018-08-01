import { OptionGroup } from '@ionic/cli-framework';
import { str2num } from '@ionic/cli-framework/utils/string';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, Ionic1ServeOptions, ServeDetails } from '../../../definitions';
import { BIND_ALL_ADDRESS, DEFAULT_DEV_LOGGER_PORT, DEFAULT_LIVERELOAD_PORT, LOCAL_ADDRESSES, SERVE_SCRIPT, ServeCLI, ServeRunner, ServeRunnerDeps } from '../../serve';
import { findOpenIonicPorts } from '../common';

import { Ionic1Project } from './';

export interface Ionic1ServeRunnerDeps extends ServeRunnerDeps {
  readonly project: Ionic1Project;
}

export class Ionic1ServeRunner extends ServeRunner<Ionic1ServeOptions> {
  constructor(protected readonly e: Ionic1ServeRunnerDeps) {
    super();
  }

  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {
      options: [
        {
          name: 'consolelogs',
          summary: 'Print app console logs to Ionic CLI',
          type: Boolean,
          aliases: ['c'],
        },
        {
          name: 'serverlogs',
          summary: 'Print dev server logs to Ionic CLI',
          type: Boolean,
          aliases: ['s'],
          groups: [OptionGroup.Hidden],
        },
        {
          name: 'livereload-port',
          summary: 'Use specific port for live-reload',
          default: DEFAULT_LIVERELOAD_PORT.toString(),
          aliases: ['r'],
          groups: [OptionGroup.Advanced],
        },
        {
          name: 'dev-logger-port',
          summary: 'Use specific port for dev server communication',
          default: DEFAULT_DEV_LOGGER_PORT.toString(),
          groups: [OptionGroup.Advanced],
        },
        {
          name: 'proxy',
          summary: 'Do not add proxies',
          type: Boolean,
          default: true,
          groups: [OptionGroup.Advanced],
          // TODO: Adding 'x' to aliases here has some weird behavior with minimist.
        },
      ],
    };
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): Ionic1ServeOptions {
    const baseOptions = super.createOptionsFromCommandLine(inputs, options);
    const livereloadPort = str2num(options['livereload-port'], DEFAULT_LIVERELOAD_PORT);
    const notificationPort = str2num(options['dev-logger-port'], DEFAULT_DEV_LOGGER_PORT);

    return {
      ...baseOptions,
      consolelogs: options['consolelogs'] ? true : false,
      serverlogs: options['serverlogs'] ? true : false,
      livereloadPort,
      notificationPort,
    };
  }

  modifyOpenURL(url: string, options: Ionic1ServeOptions): string {
    return `${url}${options.browserOption ? options.browserOption : ''}${options.platform ? `?ionicplatform=${options.platform}` : ''}`;
  }

  async serveProject(options: Ionic1ServeOptions): Promise<ServeDetails> {
    const [ externalIP, availableInterfaces ] = await this.selectExternalIP(options);
    const { port, livereloadPort, notificationPort } = await findOpenIonicPorts(options.address, options);

    options.port = port;
    options.livereloadPort = livereloadPort;
    options.notificationPort = notificationPort;

    const v1 = new Ionic1ServeCLI(this.e);
    await v1.start(options);

    return {
      custom: v1.resolvedProgram !== v1.program,
      protocol: 'http',
      localAddress: 'localhost',
      externalAddress: externalIP,
      externalNetworkInterfaces: availableInterfaces,
      port,
      externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(externalIP),
    };
  }
}

class Ionic1ServeCLI extends ServeCLI<Ionic1ServeOptions> {
  readonly name = 'Ionic 1 Toolkit';
  readonly pkg = '@ionic/v1-toolkit';
  readonly program = 'ionic-v1';
  readonly prefix = 'v1';
  readonly script = SERVE_SCRIPT;

  protected stdoutFilter(line: string): boolean {
    if (this.resolvedProgram !== this.program) {
      return super.stdoutFilter(line);
    }

    if (line.includes('server running')) {
      this.emit('ready');
      return false;
    }

    return true;
  }

  protected async buildArgs(options: Ionic1ServeOptions): Promise<string[]> {
    const { pkgManagerArgs } = await import('../../utils/npm');

    const args = ['--host', options.address, '--port', String(options.port), '--lr-port', String(options.livereloadPort), '--dev-port', String(options.notificationPort)];

    if (this.resolvedProgram === this.program) {
      const v1utilArgs = ['serve'];

      if (options.consolelogs) {
        v1utilArgs.push('-c');
      }

      return [...v1utilArgs, ...args];
    } else {
      const [ , ...pkgArgs ] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'run', script: this.script, scriptArgs: [...args] });
      return pkgArgs;
    }
  }
}
