import { MetadataGroup } from '@ionic/cli-framework';
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
          groups: ['cordova'],
          aliases: ['c'],
        },
        {
          name: 'serverlogs',
          summary: 'Print dev server logs to Ionic CLI',
          type: Boolean,
          aliases: ['s'],
          groups: [MetadataGroup.HIDDEN, 'cordova'],
        },
        {
          name: 'livereload-port',
          summary: 'Use specific port for live-reload',
          default: DEFAULT_LIVERELOAD_PORT.toString(),
          aliases: ['r'],
          groups: [MetadataGroup.ADVANCED, 'cordova'],
          spec: { value: 'port' },
        },
        {
          name: 'dev-logger-port',
          summary: 'Use specific port for dev server communication',
          default: DEFAULT_DEV_LOGGER_PORT.toString(),
          groups: [MetadataGroup.ADVANCED, 'cordova'],
          spec: { value: 'port' },
        },
        {
          name: 'proxy',
          summary: 'Do not add proxies',
          type: Boolean,
          default: true,
          groups: [MetadataGroup.ADVANCED, 'cordova'],
          // TODO: Adding 'x' to aliases here has some weird behavior with minimist.
        },
      ],
      exampleCommands: [
        '-c',
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

  modifyOpenUrl(url: string, options: Ionic1ServeOptions): string {
    return `${url}${options.browserOption ? options.browserOption : ''}${options.platform ? `?ionicplatform=${options.platform}` : ''}`;
  }

  async serveProject(options: Ionic1ServeOptions): Promise<ServeDetails> {
    const [ externalIP, availableInterfaces ] = await this.selectExternalIP(options);
    const { port, livereloadPort, notificationPort } = await findOpenIonicPorts(options.host, options);

    options.port = port;
    options.livereloadPort = livereloadPort;
    options.notificationPort = notificationPort;

    const v1 = new Ionic1ServeCLI(this.e);
    await v1.serve(options);

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

  getUsedPorts(options: Ionic1ServeOptions, details: ServeDetails): number[] {
    return [
      ...super.getUsedPorts(options, details),
      ...options.livereloadPort ? [options.livereloadPort] : [],
      ...options.notificationPort ? [options.notificationPort] : [],
    ];
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

    const args = [
      `--host=${options.host}`,
      `--port=${String(options.port)}`,
      `--livereload-port=${String(options.livereloadPort)}`,
      `--dev-port=${String(options.notificationPort)}`,
      `--engine=${options.engine}`,
    ];

    if (options.platform) {
      args.push(`--platform=${options.platform}`);
    }

    if (options.consolelogs) {
      args.push('-c');
    }

    if (this.resolvedProgram === this.program) {
      return ['serve', ...args];
    } else {
      const [ , ...pkgArgs ] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'run', script: this.script, scriptArgs: [...args] });
      return pkgArgs;
    }
  }
}
