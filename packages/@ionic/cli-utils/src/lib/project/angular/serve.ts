import chalk from 'chalk';
import * as Debug from 'debug';
import * as split2 from 'split2';
import * as through2 from 'through2';

import { CommandGroup, LOGGER_LEVELS, OptionGroup, ParsedArgs, createPrefixedFormatter, unparseArgs } from '@ionic/cli-framework';
import { findClosestOpenPort, isHostConnectable } from '@ionic/cli-framework/utils/network';
import { onBeforeExit } from '@ionic/cli-framework/utils/process';

import { AngularServeOptions, CommandLineInputs, CommandLineOptions, CommandMetadata, ServeDetails } from '../../../definitions';
import { FatalException, ServeCommandNotFoundException } from '../../errors';
import { BIND_ALL_ADDRESS, LOCAL_ADDRESSES, SERVE_SCRIPT, ServeRunner, ServeRunnerDeps } from '../../serve';

import { AngularProject } from './';

const DEFAULT_PROGRAM = 'ng';

const NG_SERVE_OPTIONS = [
  {
    name: 'configuration',
    summary: 'Specify the configuration to use.',
    type: String,
    groups: [OptionGroup.Advanced],
    hint: chalk.dim('[ng]'),
  },
];

const debug = Debug('ionic:cli-utils:lib:project:angular:serve');

interface ServeCmdDetails {
  readonly program: string;
}

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
    return `${url}${options.browserOption ? options.browserOption : ''}${options.platform ? `?ionic:mode=${this.platformToMode(options.platform)}` : ''}`;
  }

  async serveProject(options: AngularServeOptions): Promise<ServeDetails> {
    const [ externalIP, availableInterfaces ] = await this.selectExternalIP(options);

    const ngPort = options.port = await findClosestOpenPort(options.port, '0.0.0.0');
    const { program } = await this.serveCommandWrapper(options);

    const interval = setInterval(() => {
      this.e.log.info(`Waiting for connectivity with ${chalk.green(program)}...`);
    }, 5000);

    await isHostConnectable(options.address, ngPort);
    clearInterval(interval);

    return {
      custom: program !== DEFAULT_PROGRAM,
      protocol: 'http',
      localAddress: 'localhost',
      externalAddress: externalIP,
      externalNetworkInterfaces: availableInterfaces,
      port: ngPort,
      externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(externalIP),
    };
  }

  private async serveCommandWrapper(options: AngularServeOptions): Promise<ServeCmdDetails> {
    try {
      return await this.servecmd(options);
    } catch (e) {
      if (!(e instanceof ServeCommandNotFoundException)) {
        throw e;
      }

      const pkg = '@angular/cli';
      this.e.log.nl();

      throw new FatalException(
        `${chalk.green(pkg)} is required for ${chalk.green('ionic serve')} to work properly.\n` +
        `Looks like ${chalk.green(pkg)} isn't installed in this project.\n\n` +
        `This package is required for ${chalk.green('ionic serve')}. For more details, please see the CHANGELOG: ${chalk.bold('https://github.com/ionic-team/ionic-cli/blob/master/packages/ionic/CHANGELOG.md#4.0.0')}`
      );
    }
  }

  private async servecmd(options: AngularServeOptions): Promise<ServeCmdDetails> {
    const { pkgManagerArgs } = await import('../../utils/npm');

    const pkg = await this.e.project.requirePackageJson();

    let program = DEFAULT_PROGRAM;
    let args = await this.serveOptionsToNgArgs(options);
    const shellOptions = { cwd: this.e.project.directory };

    debug(`Looking for ${chalk.cyan(SERVE_SCRIPT)} npm script.`);

    if (pkg.scripts && pkg.scripts[SERVE_SCRIPT]) {
      debug(`Invoking ${chalk.cyan(SERVE_SCRIPT)} npm script.`);
      const [ pkgManager, ...pkgArgs ] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'run', script: SERVE_SCRIPT, scriptArgs: [...args] });
      program = pkgManager;
      args = pkgArgs;
    } else {
      args = [...this.buildArchitectCommand(options), ...args];
    }

    const p = this.e.shell.spawn(program, args, shellOptions);
    this.emit('cli-utility-spawn', p);

    return new Promise<ServeCmdDetails>((resolve, reject) => {
      p.on('error', (err: NodeJS.ErrnoException) => {
        if (program === DEFAULT_PROGRAM && err.code === 'ENOENT') {
          reject(new ServeCommandNotFoundException(`${chalk.bold(DEFAULT_PROGRAM)} command not found.`));
        } else {
          reject(err);
        }
      });

      onBeforeExit(async () => p.kill());

      const log = this.e.log.clone();
      log.setFormatter(createPrefixedFormatter(chalk.dim(`[${program}]`)));
      const ws = log.createWriteStream(LOGGER_LEVELS.INFO);

      if (program === DEFAULT_PROGRAM) {
        const stdoutFilter = through2(function(chunk, enc, callback) {
          const str = chunk.toString();

          if (!str.includes('Development Server is listening')) {
            this.push(chunk);
          }

          callback();
        });

        p.stdout.pipe(split2()).pipe(stdoutFilter).pipe(ws);
        p.stderr.pipe(split2()).pipe(ws);
      } else {
        p.stdout.pipe(split2()).pipe(ws);
        p.stderr.pipe(split2()).pipe(ws);
      }

      resolve({ program });
    });
  }

  async serveOptionsToNgArgs(options: AngularServeOptions): Promise<string[]> {
    const args: ParsedArgs = {
      _: [],
      host: options.address,
      port: String(options.port),
      'source-map': options.sourcemaps !== false ? options.sourcemaps : 'false',
    };

    if (options.engine === 'cordova') {
      const integration = await this.e.project.getIntegration('cordova');
      args.platform = options.platform;

      if (this.e.project.directory !== integration.root) {
        args.cordovaBasePath = integration.root;
      }
    }

    return [...unparseArgs(args), ...options['--']];
  }

  buildArchitectCommand(options: AngularServeOptions): string[] {
    const cmd = options.engine === 'cordova' ? 'ionic-cordova-serve' : 'serve';
    const project = options.project ? options.project : 'app';

    return ['run', `${project}:${cmd}${options.configuration ? `:${options.configuration}` : ''}`];
  }
}
