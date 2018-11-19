import { OptionGroup, ParsedArgs, unparseArgs } from '@ionic/cli-framework';
import { str2num } from '@ionic/cli-framework/utils/string';
import chalk from 'chalk';
import * as Debug from 'debug';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, IonicAngularServeOptions, ServeDetails } from '../../../definitions';
import { BIND_ALL_ADDRESS, DEFAULT_DEV_LOGGER_PORT, DEFAULT_LIVERELOAD_PORT, LOCAL_ADDRESSES, SERVE_SCRIPT, ServeCLI, ServeRunner, ServeRunnerDeps } from '../../serve';
import { findOpenIonicPorts } from '../common';

import { IonicAngularProject } from './';
import { APP_SCRIPTS_OPTIONS } from './app-scripts';

const debug = Debug('ionic:lib:project:ionic-angular:serve');

const DEFAULT_PROGRAM = 'ionic-app-scripts';
export const DEFAULT_SERVE_SCRIPT_VALUE = `${DEFAULT_PROGRAM} serve`;

export interface IonicAngularServeRunnerDeps extends ServeRunnerDeps {
  readonly project: IonicAngularProject;
}

export class IonicAngularServeRunner extends ServeRunner<IonicAngularServeOptions> {
  constructor(protected readonly e: IonicAngularServeRunnerDeps) {
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
          hint: chalk.dim('[app-scripts]'),
        },
        {
          name: 'serverlogs',
          summary: 'Print dev server logs to Ionic CLI',
          type: Boolean,
          aliases: ['s'],
          groups: [OptionGroup.Hidden],
          hint: chalk.dim('[app-scripts]'),
        },
        {
          name: 'livereload-port',
          summary: 'Use specific port for live-reload',
          default: DEFAULT_LIVERELOAD_PORT.toString(),
          aliases: ['r'],
          groups: [OptionGroup.Advanced],
          hint: chalk.dim('[app-scripts]'),
          spec: { value: 'port' },
        },
        {
          name: 'dev-logger-port',
          summary: 'Use specific port for dev server',
          default: DEFAULT_DEV_LOGGER_PORT.toString(),
          groups: [OptionGroup.Advanced],
          hint: chalk.dim('[app-scripts]'),
          spec: { value: 'port' },
        },
        {
          name: 'proxy',
          summary: 'Do not add proxies',
          type: Boolean,
          default: true,
          groups: [OptionGroup.Advanced],
          hint: chalk.dim('[app-scripts]'),
          // TODO: Adding 'x' to aliases here has some weird behavior with minimist.
        },
        {
          name: 'source-map',
          summary: 'Output sourcemaps',
          type: Boolean,
          groups: [OptionGroup.Advanced],
          hint: chalk.dim('[app-scripts]'),
        },
        ...APP_SCRIPTS_OPTIONS,
      ],
      exampleCommands: [
        '-- --enableLint false',
      ],
    };
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): IonicAngularServeOptions {
    const baseOptions = super.createOptionsFromCommandLine(inputs, options);
    const sourcemaps = typeof options['source-map'] === 'boolean' ? Boolean(options['source-map']) : undefined;
    const livereloadPort = str2num(options['livereload-port'], DEFAULT_LIVERELOAD_PORT);
    const notificationPort = str2num(options['dev-logger-port'], DEFAULT_DEV_LOGGER_PORT);

    return {
      ...baseOptions,
      sourcemaps,
      consolelogs: options['consolelogs'] ? true : false,
      serverlogs: options['serverlogs'] ? true : false,
      livereloadPort,
      notificationPort,
      env: options['env'] ? String(options['env']) : undefined,
    };
  }

  modifyOpenURL(url: string, options: IonicAngularServeOptions): string {
    return `${url}${options.browserOption ? options.browserOption : ''}${options.platform ? `?ionicplatform=${options.platform}` : ''}`;
  }

  async serveProject(options: IonicAngularServeOptions): Promise<ServeDetails> {
    const [ externalIP, availableInterfaces ] = await this.selectExternalIP(options);
    const { port, livereloadPort, notificationPort } = await findOpenIonicPorts(options.address, options);

    options.port = port;
    options.livereloadPort = livereloadPort;
    options.notificationPort = notificationPort;

    const appscripts = new IonicAngularServeCLI(this.e);
    await appscripts.serve(options);

    return {
      custom: appscripts.resolvedProgram !== appscripts.program,
      protocol: 'http',
      localAddress: 'localhost',
      externalAddress: externalIP,
      externalNetworkInterfaces: availableInterfaces,
      port,
      externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(externalIP),
    };
  }
}

class IonicAngularServeCLI extends ServeCLI<IonicAngularServeOptions> {
  readonly name = 'Ionic App Scripts';
  readonly pkg = '@ionic/app-scripts';
  readonly program = DEFAULT_PROGRAM;
  readonly prefix = 'app-scripts';
  readonly script?: string = SERVE_SCRIPT;

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

  protected async buildArgs(options: IonicAngularServeOptions): Promise<string[]> {
    const { pkgManagerArgs } = await import('../../utils/npm');

    const args = this.serveOptionsToAppScriptsArgs(options);

    if (this.resolvedProgram === this.program) {
      return ['serve', ...args];
    } else {
      const [ , ...pkgArgs ] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'run', script: this.script, scriptArgs: [...args] });
      return pkgArgs;
    }
  }

  protected serveOptionsToAppScriptsArgs(options: IonicAngularServeOptions): string[] {
    const args: ParsedArgs = {
      _: [],
      address: options.address,
      port: String(options.port),
      'livereload-port': String(options.livereloadPort),
      'dev-logger-port': String(options.notificationPort),
      consolelogs: options.consolelogs,
      serverlogs: options.serverlogs,
      nobrowser: true,
      nolivereload: !options.livereload,
      noproxy: !options.proxy,
      iscordovaserve: options.engine === 'cordova',
      generateSourceMap: typeof options.sourcemaps !== 'undefined' ? options.sourcemaps ? 'true' : 'false' : undefined,
      platform: options.platform,
      target: options.engine === 'cordova' ? 'cordova' : undefined,
      env: options.env,
    };

    return [...unparseArgs(args, { allowCamelCase: true, useEquals: false }), ...options['--']];
  }

  protected async resolveProgram(): Promise<string> {
    if (typeof this.script !== 'undefined') {
      debug(`Looking for ${chalk.cyan(this.script)} npm script.`);

      const pkg = await this.e.project.requirePackageJson();

      if (pkg.scripts && pkg.scripts[this.script]) {
        if (pkg.scripts[this.script] === DEFAULT_SERVE_SCRIPT_VALUE) {
          debug(`Found ${chalk.cyan(this.script)}, but it is the default. Not running.`);
        } else {
          debug(`Using ${chalk.cyan(this.script)} npm script.`);
          return this.e.config.get('npmClient');
        }
      }
    }

    return this.program;
  }
}
