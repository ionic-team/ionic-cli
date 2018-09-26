import chalk from 'chalk';

import { CommandGroup, OptionGroup, ParsedArgs, unparseArgs } from '@ionic/cli-framework';
import { findClosestOpenPort } from '@ionic/utils-network';

import { AngularServeOptions, CommandLineInputs, CommandLineOptions, CommandMetadata, ServeDetails } from '../../../definitions';
import { BIND_ALL_ADDRESS, LOCAL_ADDRESSES, SERVE_SCRIPT, ServeCLI, ServeRunner, ServeRunnerDeps } from '../../serve';

import { AngularProject } from './';

const NG_SERVE_OPTIONS = [
  {
    name: 'configuration',
    summary: 'Specify the configuration to use.',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: chalk.dim('[ng]'),
  },
];

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
${chalk.green('ionic serve')} uses the Angular CLI. Use ${chalk.green('ng serve --help')} to list all Angular CLI options for serving your app. See the ${chalk.green('ng serve')} docs${chalk.cyan('[1]')} for explanations. Options not listed below are considered advanced and can be passed to the Angular CLI using the ${chalk.green('--')} separator after the Ionic CLI arguments. See the examples.

${chalk.cyan('[1]')}: ${chalk.bold('https://github.com/angular/angular-cli/wiki/serve')}`,
      options: [
        {
          name: 'prod',
          summary: `Flag to use the ${chalk.green('production')} configuration`,
          type: Boolean,
          hint: chalk.dim('[ng]'),
        },
        {
          name: 'source-map',
          summary: 'Output sourcemaps',
          type: Boolean,
          groups: [OptionGroup.Advanced],
          hint: chalk.dim('[ng]'),
        },
        ...NG_SERVE_OPTIONS,
      ],
      exampleCommands: [
        '-- --proxy-config proxy.conf.json',
      ],
    };
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): AngularServeOptions {
    const baseOptions = super.createOptionsFromCommandLine(inputs, options);
    const prod = options['prod'] ? Boolean(options['prod']) : undefined;
    const configuration = options['configuration'] ? String(options['configuration']) : (prod ? 'production' : undefined);
    const sourcemaps = typeof options['source-map'] === 'boolean' ? Boolean(options['source-map']) : undefined;

    return {
      ...baseOptions,
      configuration,
      sourcemaps,
    };
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
      protocol: 'http',
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

  protected stdoutFilter(line: string): boolean {
    if (this.resolvedProgram !== this.program) {
      return super.stdoutFilter(line);
    }

    if (line.includes('Development Server is listening')) {
      this.emit('ready');
      return false;
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
      port: String(options.port),
      'source-map': options.sourcemaps !== false ? options.sourcemaps : 'false',
    };

    let separatedArgs = options['--'];

    if (options.engine === 'cordova') {
      const integration = await this.e.project.getIntegration('cordova');
      args.platform = options.platform;

      if (this.e.project.directory !== integration.root) {
        args.cordovaBasePath = integration.root;
      }

      separatedArgs = [];
    }

    return [...unparseArgs(args), ...separatedArgs];
  }

  protected buildArchitectCommand(options: AngularServeOptions): string[] {
    const cmd = options.engine === 'cordova' ? 'ionic-cordova-serve' : 'serve';
    const project = options.project ? options.project : 'app';

    return ['run', `${project}:${cmd}${options.configuration ? `:${options.configuration}` : ''}`];
  }
}
