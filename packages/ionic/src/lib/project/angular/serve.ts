import { CommandGroup, OptionGroup, ParsedArgs, unparseArgs } from '@ionic/cli-framework';
import { stripAnsi } from '@ionic/cli-framework/utils/format';
import { findClosestOpenPort } from '@ionic/utils-network';
import chalk from 'chalk';

import { AngularServeOptions, CommandLineInputs, CommandLineOptions, CommandMetadata, ServeDetails } from '../../../definitions';
import { BIND_ALL_ADDRESS, LOCAL_ADDRESSES, SERVE_SCRIPT, ServeCLI, ServeRunner, ServeRunnerDeps } from '../../serve';

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
      groups: [CommandGroup.Beta],
      description: `
${chalk.green('ionic serve')} uses the Angular CLI. Use ${chalk.green('ng serve --help')} to list all Angular CLI options for serving your app. See the ${chalk.green('ng serve')} docs[^ng-serve-docs] for explanations. Options not listed below are considered advanced and can be passed to the Angular CLI using the ${chalk.green('--')} separator after the Ionic CLI arguments. See the examples.

The dev server can use HTTPS via the ${chalk.green('--ssl')} option ${chalk.bold.red('(experimental)')}. There are several known issues with HTTPS. See issue #3305[^issue-3305].
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
          name: 'ssl',
          summary: 'Use HTTPS for the dev server',
          type: Boolean,
          groups: [OptionGroup.Experimental, 'cordova'],
          hint: chalk.dim('[ng]'),
        },
        {
          name: 'prod',
          summary: `Flag to use the ${chalk.green('production')} configuration`,
          type: Boolean,
          groups: ['cordova'],
          hint: chalk.dim('[ng]'),
        },
        {
          name: 'configuration',
          summary: 'Specify the configuration to use.',
          type: String,
          groups: [OptionGroup.Advanced, 'cordova'],
          hint: chalk.dim('[ng]'),
          spec: { value: 'conf' },
        },
        {
          name: 'source-map',
          summary: 'Output sourcemaps',
          type: Boolean,
          groups: [OptionGroup.Advanced, 'cordova'],
          hint: chalk.dim('[ng]'),
        },
        {
          name: 'devapp',
          summary: 'Publish DevApp service',
          type: Boolean,
          default: false,
          groups: [OptionGroup.Advanced],
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

    return {
      ...baseOptions,
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

    const ng = new AngularServeCLI(this.e);
    await ng.serve(options);

    return {
      custom: ng.resolvedProgram !== ng.program,
      protocol: options.ssl ? 'https' : 'http',
      localAddress: 'localhost',
      externalAddress: externalIP,
      externalNetworkInterfaces: availableInterfaces,
      port,
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
        this.e.log.info(`... and ${chalk.bold(chunks.toString())} additional chunks`);
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
