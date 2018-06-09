import {
  BaseError,
  LOGGER_LEVELS,
  NetworkInterface,
  OptionGroup,
  PromptModule,
  createPrefixedFormatter,
} from '@ionic/cli-framework';
import { fsReadJsonFile } from '@ionic/cli-framework/utils/fs';
import { findClosestOpenPort, getExternalIPv4Interfaces } from '@ionic/cli-framework/utils/network';
import { onBeforeExit, processExit } from '@ionic/cli-framework/utils/process';
import { str2num } from '@ionic/cli-framework/utils/string';
import chalk from 'chalk';
import { ChildProcess } from 'child_process';
import * as Debug from 'debug';
import { EventEmitter } from 'events';
import * as lodash from 'lodash';
import * as os from 'os';
import * as path from 'path';
import * as split2 from 'split2';
import * as through2 from 'through2';

import { ASSETS_DIRECTORY, PROJECT_FILE } from '../constants';
import {
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  CommandMetadataOption,
  DevAppDetails,
  IConfig,
  ILogger,
  IProject,
  IShell,
  IonicEnvironment,
  LabServeDetails,
  Runner,
  ServeDetails,
  ServeOptions,
} from '../definitions';
import { isCordovaPackageJson } from '../guards';

import { FatalException, RunnerException, RunnerNotFoundException } from './errors';
import { Hook } from './hooks';
import * as ζprojectAngularServe from './project/angular/serve';
import * as ζprojectIonicAngularServe from './project/ionic-angular/serve';
import * as ζprojectIonic1Serve from './project/ionic1/serve';
import { PkgManagerOptions } from './utils/npm';

const debug = Debug('ionic:cli-utils:lib:serve');

export const DEFAULT_DEV_LOGGER_PORT = 53703;
export const DEFAULT_LIVERELOAD_PORT = 35729;
export const DEFAULT_SERVER_PORT = 8100;
export const DEFAULT_LAB_PORT = 8200;
export const DEFAULT_DEVAPP_COMM_PORT = 53233;

export const BIND_ALL_ADDRESS = '0.0.0.0';
export const LOCAL_ADDRESSES = ['localhost', '127.0.0.1'];

export const BROWSERS = ['safari', 'firefox', process.platform === 'win32' ? 'chrome' : (process.platform === 'darwin' ? 'google chrome' : 'google-chrome')];

// npm script name
export const SERVE_SCRIPT = 'ionic:serve';

export const COMMON_SERVE_COMMAND_OPTIONS: ReadonlyArray<CommandMetadataOption> = [
  {
    name: 'address',
    summary: 'Use specific address for the dev server',
    default: BIND_ALL_ADDRESS,
    groups: [OptionGroup.Advanced],
  },
  {
    name: 'port',
    summary: 'Use specific port for HTTP',
    default: DEFAULT_SERVER_PORT.toString(),
    aliases: ['p'],
    groups: [OptionGroup.Advanced],
  },
  {
    name: 'livereload',
    summary: 'Do not spin up dev server--just serve files',
    type: Boolean,
    default: true,
  },
  {
    name: 'engine',
    summary: `Target engine (e.g. ${['browser', 'cordova'].map(e => chalk.green(e)).join(', ')})`,
    groups: [OptionGroup.Advanced],
  },
  {
    name: 'platform',
    summary: `Target platform on chosen engine (e.g. ${['ios', 'android'].map(e => chalk.green(e)).join(', ')})`,
    groups: [OptionGroup.Advanced],
  },
  {
    name: 'project',
    summary: 'The name of the project',
    groups: [OptionGroup.Experimental],
  },
];

export interface ServeRunnerDeps {
  readonly config: IConfig;
  readonly log: ILogger;
  readonly project: IProject;
  readonly prompt: PromptModule;
  readonly shell: IShell;
}

export interface ServeRunner<T extends ServeOptions> {
  on(event: 'cli-utility-spawn', handler: (cp: ChildProcess) => void): this;
  emit(event: 'cli-utility-spawn', cp: ChildProcess): boolean;
}

export abstract class ServeRunner<T extends ServeOptions> extends EventEmitter implements Runner<T, ServeDetails> {
  protected readonly config: IConfig;
  protected readonly log: ILogger;
  protected readonly project: IProject;
  protected readonly prompt: PromptModule;
  protected readonly shell: IShell;

  protected devAppConnectionMade = false;

  constructor({ config, log, project, prompt, shell }: ServeRunnerDeps) {
    super();
    this.config = config;
    this.log = log;
    this.project = project;
    this.prompt = prompt;
    this.shell = shell;
  }

  static async createFromProject(deps: ServeRunnerDeps): Promise<ζprojectAngularServe.ServeRunner>;
  static async createFromProject(deps: ServeRunnerDeps): Promise<ζprojectIonicAngularServe.ServeRunner>;
  static async createFromProject(deps: ServeRunnerDeps): Promise<ζprojectIonic1Serve.ServeRunner>;
  static async createFromProject(deps: ServeRunnerDeps): Promise<ServeRunner<any>>;
  static async createFromProject(deps: ServeRunnerDeps): Promise<ServeRunner<any>> {
    if (deps.project.type === 'ionic1') {
      const { ServeRunner } = await import('./project/ionic1/serve');
      return new ServeRunner(deps);
    } else if (deps.project.type === 'ionic-angular') {
      const { ServeRunner } = await import('./project/ionic-angular/serve');
      return new ServeRunner(deps);
    } else if (deps.project.type === 'angular') {
      const { ServeRunner } = await import('./project/angular/serve');
      return new ServeRunner(deps);
    } else {
      throw new RunnerNotFoundException(
        `Cannot perform serve for ${deps.project.type ? '' : 'unknown '}project type${deps.project.type ? `: ${chalk.bold(deps.project.type)}` : ''}.\n` +
        (deps.project.type === 'custom' ? `Since you're using the ${chalk.bold('custom')} project type, this command won't work. The Ionic CLI doesn't know how to serve custom projects.\n\n` : '') +
        `If you'd like the CLI to try to detect your project type, you can unset the ${chalk.bold('type')} attribute in ${chalk.bold(PROJECT_FILE)}.`
      );
    }
  }

  abstract getCommandMetadata(): Promise<Partial<CommandMetadata>>;
  abstract serveProject(options: T): Promise<ServeDetails>;
  abstract modifyOpenURL(url: string, options: T): string;

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): ServeOptions {
    const separatedArgs = options['--'];

    if (options['local']) {
      options['address'] = 'localhost';
      options['devapp'] = false;
    }

    const engine = this.determineEngineFromCommandLine(options);
    const address = options['address'] ? String(options['address']) : BIND_ALL_ADDRESS;
    const labPort = str2num(options['lab-port'], DEFAULT_LAB_PORT);
    const port = str2num(options['port'], DEFAULT_SERVER_PORT);

    return {
      '--': separatedArgs ? separatedArgs : [],
      address,
      browser: options['browser'] ? String(options['browser']) : undefined,
      browserOption: options['browseroption'] ? String(options['browseroption']) : undefined,
      devapp: engine === 'browser' && (typeof options['devapp'] === 'undefined' || options['devapp']) ? true : false,
      engine,
      externalAddressRequired: options['externalAddressRequired'] ? true : false,
      lab: options['lab'] ? true : false,
      labHost: options['lab-host'] ? String(options['lab-host']) : 'localhost',
      labPort,
      livereload: typeof options['livereload'] === 'boolean' ? Boolean(options['livereload']) : true,
      open: options['open'] ? true : false,
      platform: options['platform'] ? String(options['platform']) : undefined,
      port,
      proxy: typeof options['proxy'] === 'boolean' ? Boolean(options['proxy']) : true,
      ssl: false,
      project: options['project'] ? String(options['project']) : undefined,
    };
  }

  determineEngineFromCommandLine(options: CommandLineOptions): string {
    if (options['engine']) {
      return String(options['engine']);
    }

    if (options['cordova']) {
      return 'cordova';
    }

    return 'browser';
  }

  async displayDevAppMessage(options: T) {
    const pkg = await this.project.requirePackageJson();

    // If this is regular `ionic serve`, we warn the dev about unsupported
    // plugins in the devapp.
    if (options.devapp && isCordovaPackageJson(pkg)) {
      const plugins = await this.getSupportedDevAppPlugins();
      const packageCordovaPlugins = Object.keys(pkg.cordova.plugins);
      const packageCordovaPluginsDiff = packageCordovaPlugins.filter(p => !plugins.has(p));

      if (packageCordovaPluginsDiff.length > 0) {
        this.log.warn(
          'Detected unsupported Cordova plugins with Ionic DevApp:\n' +
          `${packageCordovaPluginsDiff.map(p => `- ${chalk.bold(p)}`).join('\n')}\n\n` +
          `App may not function as expected in Ionic DevApp and Ionic View.`
        );
      }
    }
  }

  async beforeServe(options: T) {
    const hook = new ServeBeforeHook({ config: this.config, project: this.project, shell: this.shell });

    try {
      await hook.run({ name: hook.name, serve: options });
    } catch (e) {
      if (e instanceof BaseError) {
        throw new FatalException(e.message);
      }

      throw e;
    }
  }

  async run(options: T): Promise<ServeDetails> {
    await this.beforeServe(options);

    const details = await this.serveProject(options);
    const devAppDetails = await this.gatherDevAppDetails(options, details);
    const labDetails = options.lab ? await this.runLab(options, details) : undefined;

    if (devAppDetails) {
      const devAppName = await this.publishDevApp(options, devAppDetails);
      devAppDetails.channel = devAppName;
    }

    const localAddress = `${details.protocol}://localhost:${details.port}`;
    const fmtExternalAddress = (address: string) => `${details.protocol}://${address}:${details.port}`;
    const labAddress = labDetails ? `${labDetails.protocol}://${labDetails.address}:${labDetails.port}` : undefined;

    this.log.nl();
    this.log.info(
      `Development server running!` +
      (labAddress ? `\nLab: ${chalk.bold(labAddress)}` : '') +
      `\nLocal: ${chalk.bold(localAddress)}` +
      (details.externalNetworkInterfaces.length > 0 ? `\nExternal: ${details.externalNetworkInterfaces.map(v => chalk.bold(fmtExternalAddress(v.address))).join(', ')}` : '') +
      (devAppDetails && devAppDetails.channel ? `\nDevApp: ${chalk.bold(devAppDetails.channel)} on ${chalk.bold(os.hostname())}` : '')
    );
    this.log.nl();

    if (options.open) {
      const openAddress = labAddress ? labAddress : localAddress;
      const openURL = this.modifyOpenURL(openAddress, options);

      const opn = await import('opn');
      await opn(openURL, { app: options.browser, wait: false });

      this.log.info(`Browser window opened to ${chalk.bold(openURL)}!`);
      this.log.nl();
    }

    this.scheduleAfterServe(options, details);

    return details;
  }

  async afterServe(options: T, details: ServeDetails) {
    const hook = new ServeAfterHook({ config: this.config, project: this.project, shell: this.shell });

    try {
      await hook.run({ name: hook.name, serve: lodash.assign({}, options, details) });
    } catch (e) {
      if (e instanceof BaseError) {
        throw new FatalException(e.message);
      }

      throw e;
    }
  }

  scheduleAfterServe(options: T, details: ServeDetails) {
    onBeforeExit(async () => this.afterServe(options, details));
  }

  async gatherDevAppDetails(options: T, details: ServeDetails): Promise<DevAppDetails | undefined> {
    if (options.devapp) {
      const { computeBroadcastAddress } = await import('./devapp');

      // TODO: There is no accurate/reliable/realistic way to identify a WiFi
      // network uniquely in NodeJS. But this is where we could detect new
      // networks and prompt the dev if they want to "trust" it (allow binding to
      // 0.0.0.0 and broadcasting).

      const interfaces = getExternalIPv4Interfaces()
        .map(i => ({ ...i, broadcast: computeBroadcastAddress(i.address, i.netmask) }));

      const { port } = details;

      // the comm server always binds to 0.0.0.0 to target every possible interface
      const commPort = await findClosestOpenPort(DEFAULT_DEVAPP_COMM_PORT, '0.0.0.0');

      return { port, commPort, interfaces };
    }
  }

  async publishDevApp(options: T, details: DevAppDetails): Promise<string | undefined> {
    if (options.devapp) {
      const { createCommServer, createPublisher } = await import('./devapp');

      const projectConfig = await this.project.load();
      const publisher = await createPublisher(projectConfig.name, details.port, details.commPort);
      const comm = await createCommServer(publisher.id, details.commPort);

      publisher.interfaces = details.interfaces;

      comm.on('error', (err: Error) => {
        debug(`Error in DevApp service: ${String(err.stack ? err.stack : err)}`);
      });

      comm.on('connect', async (data: any) => {
        if (!this.devAppConnectionMade) {
          this.devAppConnectionMade = true;
          await this.displayDevAppMessage(options);
        }

        this.log.info(`DevApp connection established from ${chalk.bold(data.email)}`);
      });

      publisher.on('error', (err: Error) => {
        debug(`Error in DevApp service: ${String(err.stack ? err.stack : err)}`);
      });

      try {
        await comm.start();
      } catch (e) {
        this.log.error(`Could not create DevApp comm server: ${String(e.stack ? e.stack : e)}`);
      }

      try {
        await publisher.start();
      } catch (e) {
        this.log.error(`Could not publish DevApp service: ${String(e.stack ? e.stack : e)}`);
      }

      return publisher.name;
    }
  }

  async getSupportedDevAppPlugins(): Promise<Set<string>> {
    const p = path.resolve(ASSETS_DIRECTORY, 'devapp', 'plugins.json');
    const plugins = await fsReadJsonFile(p);

    if (!Array.isArray(plugins)) {
      throw new Error(`Cannot read ${p} file of supported plugins.`);
    }

    // This one is common, and hopefully obvious enough that the devapp doesn't
    // use any splash screen but its own, so we mark it as "supported".
    plugins.push('cordova-plugin-splashscreen');

    return new Set(plugins);
  }

  async runLab(options: T, details: ServeDetails): Promise<LabServeDetails> {
    const labDetails: LabServeDetails = {
      protocol: options.ssl ? 'https' : 'http',
      address: options.labHost,
      port: await findClosestOpenPort(options.labPort, options.labHost),
    };

    if (options.ssl) {
      const projectConfig = await this.project.load();

      if (projectConfig.ssl && projectConfig.ssl.key && projectConfig.ssl.cert) {
        labDetails.ssl = { key: projectConfig.ssl.key, cert: projectConfig.ssl.cert };
      } else {
        throw new FatalException(
          `Both ${chalk.green('ssl.key')} and ${chalk.green('ssl.cert')} config entries must be set.\n` +
          `See ${chalk.green('ionic serve --help')} for details on using your own SSL key and certificate for Ionic Lab and the dev server.`
        );
      }
    }

    const appUrl = `${details.protocol}://localhost:${details.port}`;

    try {
      await this.runLabServer(appUrl, labDetails);
    } catch (e) {
      if (e.code === 'ENOENT') {
        const pkg = '@ionic/lab';
        const requiredMsg = `This package is required for Ionic Lab as of CLI 4.0. For more details, please see the CHANGELOG: ${chalk.bold('https://github.com/ionic-team/ionic-cli/blob/master/packages/ionic/CHANGELOG.md#4.0.0')}`;
        this.log.nl();
        this.log.info(`Looks like ${chalk.green(pkg)} isn't installed in this project.\n` + requiredMsg);

        const installed = await this.promptToInstallPkg({ pkg, saveDev: true });

        if (!installed) {
          throw new FatalException(`${chalk.green(pkg)} is required for Ionic Lab to work properly.\n` + requiredMsg);
        }

        await this.runLabServer(appUrl, labDetails);
      }
    }

    return labDetails;
  }

  async runLabServer(url: string, details: LabServeDetails): Promise<void> {
    const projectConfig = await this.project.load();
    const pkg = await this.project.requirePackageJson();

    const labArgs = [url, '--host', details.address, '--port', String(details.port)];
    const nameArgs = projectConfig.name ? ['--app-name', projectConfig.name] : [];
    const versionArgs = pkg.version ? ['--app-version', pkg.version] : [];

    if (details.ssl) {
      labArgs.push('--ssl', '--ssl-key', details.ssl.key, '--ssl-cert', details.ssl.cert);
    }

    const p = this.shell.spawn('ionic-lab', [...labArgs, ...nameArgs, ...versionArgs], { cwd: this.project.directory });
    this.emit('cli-utility-spawn', p);

    return new Promise<void>((resolve, reject) => {
      p.on('error', err => {
        reject(err);
      });

      onBeforeExit(async () => p.kill());

      const log = this.log.clone();
      log.setFormatter(createPrefixedFormatter(chalk.dim('[lab]')));
      const ws = log.createWriteStream(LOGGER_LEVELS.INFO);

      const stdoutFilter = through2((chunk, enc, callback) => {
        const str = chunk.toString();

        if (str.includes('Ionic Lab running')) {
          resolve();
        } else {
          // no stdout
        }

        callback();
      });

      p.stdout.pipe(split2()).pipe(stdoutFilter).pipe(ws);
      p.stderr.pipe(split2()).pipe(ws);
    });
  }

  async promptToInstallPkg(options: Partial<PkgManagerOptions> & { pkg: string; }): Promise<boolean> {
    const { pkgManagerArgs } = await import('./utils/npm');
    const config = await this.config.load();
    const { npmClient } = config;
    const [ manager, ...managerArgs ] = await pkgManagerArgs(npmClient, { command: 'install', ...options });

    const confirm = await this.prompt({
      name: 'confirm',
      message: `Install ${chalk.green(options.pkg)}?`,
      type: 'confirm',
    });

    if (!confirm) {
      this.log.warn(`Not installing--here's how to install manually: ${chalk.green(`${manager} ${managerArgs.join(' ')}`)}`);
      return false;
    }

    await this.shell.run(manager, managerArgs, { cwd: this.project.directory });

    return true;
  }

  async selectExternalIP(options: T): Promise<[string, NetworkInterface[]]> {
    let availableInterfaces: NetworkInterface[] = [];
    let chosenIP = options.address;

    if (options.address === BIND_ALL_ADDRESS) {
      availableInterfaces = getExternalIPv4Interfaces();

      if (availableInterfaces.length === 0) {
        if (options.externalAddressRequired) {
          throw new FatalException(
            `No external network interfaces detected. In order to use livereload with run/emulate you will need one.\n` +
            `Are you connected to a local network?\n`
          );
        }
      } else if (availableInterfaces.length === 1) {
        chosenIP = availableInterfaces[0].address;
      } else if (availableInterfaces.length > 1) {
        if (options.externalAddressRequired) {
          this.log.warn(
            'Multiple network interfaces detected!\n' +
            'You will be prompted to select an external-facing IP for the livereload server that your device or emulator has access to.\n\n' +
            `You may also use the ${chalk.green('--address')} option to skip this prompt.`
          );

          const promptedIp = await this.prompt({
            type: 'list',
            name: 'promptedIp',
            message: 'Please select which IP to use:',
            choices: availableInterfaces.map(i => ({
              name: `${i.address} ${chalk.dim(`(${i.device})`)}`,
              value: i.address,
            })),
          });

          chosenIP = promptedIp;
        }
      }
    }

    return [ chosenIP, availableInterfaces ];
  }
}

class ServeBeforeHook extends Hook {
  readonly name = 'serve:before';
}

class ServeAfterHook extends Hook {
  readonly name = 'serve:after';
}

export async function serve(env: IonicEnvironment, inputs: CommandLineInputs, options: CommandLineOptions): Promise<ServeDetails> {
  try {
    const runner = await ServeRunner.createFromProject(env);

    runner.on('cli-utility-spawn', cp => {
      cp.on('close', code => {
        env.log.nl();
        env.log.error(
          `A utility CLI has unexpectedly closed.\n` +
          'The Ionic CLI will exit. Please check any output above for error details.'
        );
        processExit(1); // tslint:disable-line:no-floating-promises
      });
    });

    if (env.project.name) {
      options['project'] = env.project.name;
    }

    const opts = runner.createOptionsFromCommandLine(inputs, options);
    const details = await runner.run(opts);

    env.keepopen = true;

    return details;
  } catch (e) {
    if (e instanceof RunnerException) {
      throw new FatalException(e.message);
    }

    throw e;
  }
}
