import { MetadataGroup, ParsedArgs, unparseArgs } from '@ionic/cli-framework';
import { stripAnsi } from '@ionic/cli-framework/utils/format';
import { str2num } from '@ionic/cli-framework/utils/string';
import { findClosestOpenPort } from '@ionic/utils-network';
import chalk from 'chalk';

import { AngularServeOptions, CommandLineInputs, CommandLineOptions, CommandMetadata, ServeDetails } from '../../../definitions';
import { input, strong, weak } from '../../color';
import { BIND_ALL_ADDRESS, DEFAULT_DEV_LOGGER_PORT as DEFAULT_CONSOLE_LOGS_PORT, LOCAL_ADDRESSES, SERVE_SCRIPT, ServeCLI, ServeRunner, ServeRunnerDeps } from '../../serve';

import { AngularProject } from './';

export interface AngularServeRunnerDeps extends ServeRunnerDeps {
  readonly project: AngularProject;
}

export class AngularServeRunner extends ServeRunner<AngularServeOptions> {
  constructor(protected readonly e: AngularServeRunnerDeps) {
    super();
  }

  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {
      description: `
${input('ionic serve')} uses the Angular CLI. Use ${input('ng serve --help')} to list all Angular CLI options for serving your app. See the ${input('ng serve')} docs[^ng-serve-docs] for explanations. Options not listed below are considered advanced and can be passed to the Angular CLI using the ${input('--')} separator after the Ionic CLI arguments. See the examples.

The dev server can use HTTPS via the ${input('--ssl')} option ${chalk.bold.red('(experimental)')}. There are several known issues with HTTPS. See issue #3305[^issue-3305].
`,
      footnotes: [
        {
          id: 'ng-serve-docs',
          url: 'https://angular.io/cli/serve',
        },
        {
          id: 'issue-3305',
          url: 'https://github.com/ionic-team/ionic-cli/issues/3305',
        },
      ],
      options: [
        {
          name: 'consolelogs',
          summary: 'Print app console logs to the terminal',
          type: Boolean,
          groups: [MetadataGroup.ADVANCED, 'cordova'],
          // aliases: ['c'], Already used by ng cli for --configuration
          hint: weak('[ng]'),
        },
        {
          name: 'consolelogs-port',
          summary: 'Use specific port for console logs server',
          type: String,
          groups: [MetadataGroup.ADVANCED, 'cordova'],
          hint: weak('[ng]'),
          spec: { value: 'port' },
        },
        {
          name: 'ssl',
          summary: 'Use HTTPS for the dev server',
          type: Boolean,
          groups: [MetadataGroup.EXPERIMENTAL, 'cordova'],
          hint: weak('[ng]'),
        },
        {
          name: 'prod',
          summary: `Flag to use the ${input('production')} configuration`,
          type: Boolean,
          groups: ['cordova'],
          hint: weak('[ng]'),
        },
        {
          name: 'configuration',
          summary: 'Specify the configuration to use.',
          type: String,
          groups: [MetadataGroup.ADVANCED, 'cordova'],
          hint: weak('[ng]'),
          spec: { value: 'conf' },
        },
        {
          name: 'source-map',
          summary: 'Output sourcemaps',
          type: Boolean,
          groups: [MetadataGroup.ADVANCED, 'cordova'],
          hint: weak('[ng]'),
        },
      ],
      exampleCommands: [
        '-- --proxy-config proxy.conf.json',
      ],
    };
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): AngularServeOptions {
    const baseOptions = super.createOptionsFromCommandLine(inputs, options);
    const prod = options['prod'] ? Boolean(options['prod']) : undefined;
    const ssl = options['ssl'] ? Boolean(options['ssl']) : undefined;
    const configuration = options['configuration'] ? String(options['configuration']) : (prod ? 'production' : undefined);
    const sourcemaps = typeof options['source-map'] === 'boolean' ? Boolean(options['source-map']) : undefined;
    let consolelogs = typeof options['consolelogs'] === 'boolean' ? Boolean(options['consolelogs']) : undefined;
    let consolelogsPort = consolelogs ? str2num(options['consolelogs-port'], DEFAULT_CONSOLE_LOGS_PORT) : undefined;

    // if not defined, default to true for devapp
    if (options.devapp) {
      consolelogs = consolelogs === undefined ? true : consolelogs;
      consolelogsPort = str2num(options['consolelogs-port'], DEFAULT_CONSOLE_LOGS_PORT);
    }

    return {
      ...baseOptions,
      consolelogs,
      consolelogsPort,
      ssl,
      configuration,
      sourcemaps,
    };
  }

  determineEngineFromCommandLine(options: CommandLineOptions): string {
    if (options['devapp']) {
      return 'cordova';
    }

    return super.determineEngineFromCommandLine(options);
  }

  platformToMode(platform: string): string {
    if (platform === 'ios') {
      return 'ios';
    }

    return 'md';
  }

  modifyOpenURL(url: string, options: AngularServeOptions): string {
    return `${url}${options.browserOption ? options.browserOption : ''}${options.platform ? `?ionic:mode=${this.platformToMode(options.platform)}&ionic:persistConfig=true` : ''}`;
  }

  async serveProject(options: AngularServeOptions): Promise<ServeDetails> {
    const [ externalIP, availableInterfaces ] = await this.selectExternalIP(options);

    const port = options.port = await findClosestOpenPort(options.port);
    let consolelogsPort;

    if (options.consolelogs && options.consolelogsPort) {
      consolelogsPort = options.consolelogsPort = await findClosestOpenPort(options.consolelogsPort);
    }
    const ng = new AngularServeCLI(this.e);
    await ng.serve(options);
    return {
      custom: ng.resolvedProgram !== ng.program,
      protocol: options.ssl ? 'https' : 'http',
      localAddress: 'localhost',
      externalAddress: externalIP,
      externalNetworkInterfaces: availableInterfaces,
      port,
      consolelogsPort,
      externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(externalIP),
    };
  }
}

export class AngularServeCLI extends ServeCLI<AngularServeOptions> {
  readonly name = 'Angular CLI';
  readonly pkg = '@angular/cli';
  readonly program = 'ng';
  readonly prefix = 'ng';
  readonly script = SERVE_SCRIPT;
  protected chunks = 0;

  async serve(options: AngularServeOptions): Promise<void> {
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

    if (strippedLine.includes('Development Server is listening')) {
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

  protected async buildArgs(options: AngularServeOptions): Promise<string[]> {
    const { pkgManagerArgs } = await import('../../utils/npm');

    const args = await this.serveOptionsToNgArgs(options);

    if (this.resolvedProgram === this.program) {
      return [...this.buildArchitectCommand(options), ...args];
    } else {
      const [ , ...pkgArgs ] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'run', script: this.script, scriptArgs: [...args] });
      return pkgArgs;
    }
  }

  protected async serveOptionsToNgArgs(options: AngularServeOptions): Promise<string[]> {
    const args: ParsedArgs = {
      _: [],
      host: options.address,
      port: options.port ? options.port.toString() : undefined,
      'source-map': options.sourcemaps !== false ? options.sourcemaps : 'false',
      'ssl': options.ssl !== false ? options.ssl : 'false',
    };

    const projectArgs = [];
    let separatedArgs = options['--'];

    if (options.engine === 'cordova') {
      const integration = this.e.project.requireIntegration('cordova');
      args.platform = options.platform;

      if (this.e.project.rootDirectory !== integration.root) {
        args.cordovaBasePath = integration.root;
      }

      separatedArgs = [];

      if (options.devapp) {
        args.cordovaMock = true;
      }
      args.consolelogs = options.consolelogs ? true : undefined;
      args['consolelogs-port'] = options.consolelogsPort ? String(options.consolelogsPort) : undefined;
    }

    if (this.resolvedProgram !== this.program) {
      if (options.configuration) {
        projectArgs.push(`--configuration=${options.configuration}`);
      }

      if (options.project) {
        projectArgs.push(`--project=${options.project}`);
      }
    }

    return [...unparseArgs(args), ...projectArgs, ...separatedArgs];
  }

  protected buildArchitectCommand(options: AngularServeOptions): string[] {
    const cmd = options.engine === 'cordova' ? 'ionic-cordova-serve' : 'serve';
    const project = options.project ? options.project : 'app';

    return ['run', `${project}:${cmd}${options.configuration ? `:${options.configuration}` : ''}`];
  }
}
