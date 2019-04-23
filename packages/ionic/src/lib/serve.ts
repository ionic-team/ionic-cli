import { BaseError, LOGGER_LEVELS, MetadataGroup, ParsedArgs, PromptModule, createPrefixedFormatter, unparseArgs } from '@ionic/cli-framework';
import { str2num } from '@ionic/cli-framework/utils/string';
import { readJson } from '@ionic/utils-fs';
import { NetworkInterface, findClosestOpenPort, getExternalIPv4Interfaces, isHostConnectable } from '@ionic/utils-network';
import { killProcessTree, onBeforeExit, processExit } from '@ionic/utils-process';
import chalk from 'chalk';
import * as Debug from 'debug';
import { EventEmitter } from 'events';
import * as lodash from 'lodash';
import * as os from 'os';
import * as path from 'path';
import * as split2 from 'split2';
import * as stream from 'stream';
import * as through2 from 'through2';

import { ASSETS_DIRECTORY } from '../constants';
import { CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataOption, DevAppDetails, IConfig, ILogger, IProject, IShell, IonicEnvironmentFlags, LabServeDetails, NpmClient, Runner, ServeDetails, ServeOptions } from '../definitions';
import { isCordovaPackageJson } from '../guards';

import { ancillary, input, strong, weak } from './color';
import { FatalException, RunnerException, ServeCLIProgramNotFoundException } from './errors';
import { emit } from './events';
import { Hook } from './hooks';
import { open } from './open';
import { createDefaultLoggerHandlers } from './utils/logger';

const debug = Debug('ionic:lib:serve');

export const DEFAULT_DEV_LOGGER_PORT = 53703;
export const DEFAULT_LIVERELOAD_PORT = 35729;
export const DEFAULT_SERVER_PORT = 8100;
export const DEFAULT_LAB_PORT = 8200;
export const DEFAULT_DEVAPP_COMM_PORT = 53233;

export const DEFAULT_ADDRESS = 'localhost';
export const BIND_ALL_ADDRESS = '0.0.0.0';
export const LOCAL_ADDRESSES = ['localhost', '127.0.0.1'];

export const BROWSERS = ['safari', 'firefox', process.platform === 'win32' ? 'chrome' : (process.platform === 'darwin' ? 'google chrome' : 'google-chrome')];

// npm script name
export const SERVE_SCRIPT = 'ionic:serve';

export const COMMON_SERVE_COMMAND_OPTIONS: ReadonlyArray<CommandMetadataOption> = [
  {
    name: 'address',
    summary: 'Use specific address for the dev server',
    default: DEFAULT_ADDRESS,
    groups: [MetadataGroup.ADVANCED],
  },
  {
    name: 'port',
    summary: 'Use specific port for HTTP',
    default: DEFAULT_SERVER_PORT.toString(),
    aliases: ['p'],
    groups: [MetadataGroup.ADVANCED],
  },
  {
    name: 'livereload',
    summary: 'Do not spin up dev server--just serve files',
    type: Boolean,
    default: true,
  },
  {
    name: 'engine',
    summary: `Target engine (e.g. ${['browser', 'cordova'].map(e => input(e)).join(', ')})`,
    groups: [MetadataGroup.HIDDEN, MetadataGroup.ADVANCED],
  },
  {
    name: 'platform',
    summary: `Target platform on chosen engine (e.g. ${['ios', 'android'].map(e => input(e)).join(', ')})`,
    groups: [MetadataGroup.HIDDEN, MetadataGroup.ADVANCED],
  },
];

export interface ServeRunnerDeps {
  readonly config: IConfig;
  readonly flags: IonicEnvironmentFlags;
  readonly log: ILogger;
  readonly project: IProject;
  readonly prompt: PromptModule;
  readonly shell: IShell;
}

export abstract class ServeRunner<T extends ServeOptions> implements Runner<T, ServeDetails> {
  protected devAppConnectionMade = false;

  protected abstract readonly e: ServeRunnerDeps;

  abstract getCommandMetadata(): Promise<Partial<CommandMetadata>>;
  abstract serveProject(options: T): Promise<ServeDetails>;
  abstract modifyOpenURL(url: string, options: T): string;

  getPkgManagerServeCLI(): PkgManagerServeCLI {
    return this.e.config.get('npmClient') === 'npm' ? new NpmServeCLI(this.e) : new YarnServeCLI(this.e);
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): ServeOptions {
    const separatedArgs = options['--'];

    if (options['devapp'] && options['address'] === DEFAULT_ADDRESS) {
      options['address'] = '0.0.0.0';
    }

    const engine = this.determineEngineFromCommandLine(options);
    const address = options['address'] ? String(options['address']) : DEFAULT_ADDRESS;
    const labPort = str2num(options['lab-port'], DEFAULT_LAB_PORT);
    const port = str2num(options['port'], DEFAULT_SERVER_PORT);

    return {
      '--': separatedArgs ? separatedArgs : [],
      address,
      browser: options['browser'] ? String(options['browser']) : undefined,
      browserOption: options['browseroption'] ? String(options['browseroption']) : undefined,
      devapp: !!options['devapp'],
      engine,
      externalAddressRequired: !!options['externalAddressRequired'],
      lab: !!options['lab'],
      labHost: options['lab-host'] ? String(options['lab-host']) : 'localhost',
      labPort,
      livereload: typeof options['livereload'] === 'boolean' ? Boolean(options['livereload']) : true,
      open: !!options['open'],
      platform: options['platform'] ? String(options['platform']) : undefined,
      port,
      proxy: typeof options['proxy'] === 'boolean' ? Boolean(options['proxy']) : true,
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
    const pkg = await this.e.project.requirePackageJson();

    // If this is regular `ionic serve`, we warn the dev about unsupported
    // plugins in the devapp.
    if (options.devapp && isCordovaPackageJson(pkg)) {
      const plugins = await this.getSupportedDevAppPlugins();
      const packageCordovaPlugins = Object.keys(pkg.cordova.plugins);
      const packageCordovaPluginsDiff = packageCordovaPlugins.filter(p => !plugins.has(p));

      if (packageCordovaPluginsDiff.length > 0) {
        this.e.log.warn(
          'Detected unsupported Cordova plugins with Ionic DevApp:\n' +
          `${packageCordovaPluginsDiff.map(p => `- ${strong(p)}`).join('\n')}\n\n` +
          `App may not function as expected in Ionic DevApp.`
        );

        this.e.log.nl();
      }
    }
  }

  async beforeServe(options: T) {
    const hook = new ServeBeforeHook(this.e);

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
    const labAddress = labDetails ? `http://${labDetails.address}:${labDetails.port}` : undefined;

    this.e.log.nl();
    this.e.log.info(
      `Development server running!` +
      (labAddress ? `\nLab: ${strong(labAddress)}` : '') +
      `\nLocal: ${strong(localAddress)}` +
      (details.externalNetworkInterfaces.length > 0 ? `\nExternal: ${details.externalNetworkInterfaces.map(v => strong(fmtExternalAddress(v.address))).join(', ')}` : '') +
      (devAppDetails && devAppDetails.channel ? `\nDevApp: ${strong(devAppDetails.channel)} on ${strong(os.hostname())}` : '') +
      `\n\n${chalk.yellow('Use Ctrl+C to quit this process')}`
    );
    this.e.log.nl();

    if (options.open) {
      const openAddress = labAddress ? labAddress : localAddress;
      const openURL = this.modifyOpenURL(openAddress, options);

      await open(openURL, { app: options.browser });

      this.e.log.info(`Browser window opened to ${strong(openURL)}!`);
      this.e.log.nl();
    }

    emit('serve:ready', details);

    this.scheduleAfterServe(options, details);

    return details;
  }

  async afterServe(options: T, details: ServeDetails) {
    const hook = new ServeAfterHook(this.e);

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
      const commPort = await findClosestOpenPort(DEFAULT_DEVAPP_COMM_PORT);

      return { port, commPort, interfaces };
    }
  }

  async publishDevApp(options: T, details: DevAppDetails): Promise<string | undefined> {
    if (options.devapp) {
      const { createCommServer, createPublisher } = await import('./devapp');

      const publisher = await createPublisher(this.e.project.config.get('name'), details.port, details.commPort);
      const comm = await createCommServer(publisher.id, details.commPort);

      publisher.interfaces = details.interfaces;

      comm.on('error', (err: Error) => {
        debug(`Error in DevApp service: ${String(err.stack ? err.stack : err)}`);
      });

      comm.on('connect', async data => {
        this.e.log.info(`DevApp connection established from ${strong(data.device)}`);
        this.e.log.nl();

        if (!this.devAppConnectionMade) {
          this.devAppConnectionMade = true;
          await this.displayDevAppMessage(options);
        }
      });

      publisher.on('error', (err: Error) => {
        debug(`Error in DevApp service: ${String(err.stack ? err.stack : err)}`);
      });

      try {
        await comm.start();
      } catch (e) {
        this.e.log.error(`Could not create DevApp comm server: ${String(e.stack ? e.stack : e)}`);
      }

      try {
        await publisher.start();
      } catch (e) {
        this.e.log.error(`Could not publish DevApp service: ${String(e.stack ? e.stack : e)}`);
      }

      return publisher.name;
    }
  }

  async getSupportedDevAppPlugins(): Promise<Set<string>> {
    const p = path.resolve(ASSETS_DIRECTORY, 'devapp', 'plugins.json');
    const plugins = await readJson(p);

    if (!Array.isArray(plugins)) {
      throw new Error(`Cannot read ${p} file of supported plugins.`);
    }

    // This one is common, and hopefully obvious enough that the devapp doesn't
    // use any splash screen but its own, so we mark it as "supported".
    plugins.push('cordova-plugin-splashscreen');

    return new Set(plugins);
  }

  async runLab(options: T, serveDetails: ServeDetails): Promise<LabServeDetails> {
    const labDetails: LabServeDetails = {
      projectType: this.e.project.type,
      address: options.labHost,
      port: await findClosestOpenPort(options.labPort),
    };

    const lab = new IonicLabServeCLI(this.e);
    await lab.serve({ serveDetails, ...labDetails });

    return labDetails;
  }

  async selectExternalIP(options: T): Promise<[string, NetworkInterface[]]> {
    let availableInterfaces: NetworkInterface[] = [];
    let chosenIP = options.address;

    if (options.address === BIND_ALL_ADDRESS) {
      // ignore link-local addresses
      availableInterfaces = getExternalIPv4Interfaces().filter(i => !i.address.startsWith('169.254'));

      if (availableInterfaces.length === 0) {
        if (options.externalAddressRequired) {
          throw new FatalException(
            `No external network interfaces detected. In order to use the dev server externally you will need one.\n` +
            `Are you connected to a local network?\n`
          );
        }
      } else if (availableInterfaces.length === 1) {
        chosenIP = availableInterfaces[0].address;
      } else if (availableInterfaces.length > 1) {
        if (options.externalAddressRequired) {
          if (this.e.flags.interactive) {
            this.e.log.warn(
              'Multiple network interfaces detected!\n' +
              'You will be prompted to select an external-facing IP for the dev server that your device or emulator has access to.\n\n' +
              `You may also use the ${input('--address')} option to skip this prompt.`
            );

            const promptedIp = await this.e.prompt({
              type: 'list',
              name: 'promptedIp',
              message: 'Please select which IP to use:',
              choices: availableInterfaces.map(i => ({
                name: `${i.address} ${weak(`(${i.device})`)}`,
                value: i.address,
              })),
            });

            chosenIP = promptedIp;
          } else {
            throw new FatalException(
              `Multiple network interfaces detected!\n` +
              `You must select an external-facing IP for the dev server that your device or emulator has access to with the ${input('--address')} option.`
            );
          }
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

export interface ServeCLIOptions {
  readonly address: string;
  readonly port: number;
}

export interface ServeCLI<T extends ServeCLIOptions> {
  emit(event: 'compile', chunks: number): boolean;
  emit(event: 'ready'): boolean;
  on(event: 'compile', handler: (chunks: number) => void): this;
  on(event: 'ready', handler: () => void): this;
  once(event: 'compile', handler: (chunks: number) => void): this;
  once(event: 'ready', handler: () => void): this;
}

export abstract class ServeCLI<T extends ServeCLIOptions> extends EventEmitter {

  /**
   * The pretty name of this Serve CLI.
   */
  abstract readonly name: string;

  /**
   * The npm package of this Serve CLI.
   */
  abstract readonly pkg: string;

  /**
   * The bin program to use for this Serve CLI.
   */
  abstract readonly program: string;

  /**
   * The prefix to use for log statements.
   */
  abstract readonly prefix: string;

  /**
   * If specified, `package.json` is inspected for this script to use instead
   * of `program`.
   */
  abstract readonly script?: string;

  /**
   * If true, the Serve CLI will not prompt to be installed.
   */
  readonly global: boolean = false;

  private _resolvedProgram?: string;

  constructor(protected readonly e: ServeRunnerDeps) {
    super();
  }

  get resolvedProgram() {
    if (this._resolvedProgram) {
      return this._resolvedProgram;
    }

    return this.program;
  }

  /**
   * Build the arguments for starting this Serve CLI. Called by `this.start()`.
   */
  protected abstract buildArgs(options: T): Promise<string[]>;

  /**
   * Called whenever a line of stdout is received.
   *
   * If `false` is returned, the line is not emitted to the log.
   *
   * By default, the CLI is considered ready whenever stdout is emitted. This
   * method should be overridden to more accurately portray readiness.
   *
   * @param line A line of stdout.
   */
  protected stdoutFilter(line: string): boolean {
    this.emit('ready');

    return true;
  }

  /**
   * Called whenever a line of stderr is received.
   *
   * If `false` is returned, the line is not emitted to the log.
   */
  protected stderrFilter(line: string): boolean {
    return true;
  }

  async resolveScript(): Promise<string | undefined> {
    if (typeof this.script === 'undefined') {
      return;
    }

    const pkg = await this.e.project.requirePackageJson();

    return pkg.scripts && pkg.scripts[this.script];
  }

  async serve(options: T): Promise<void> {
    this._resolvedProgram = await this.resolveProgram();

    await this.spawnWrapper(options);

    const interval = setInterval(() => {
      this.e.log.info(`Waiting for connectivity with ${input(this.resolvedProgram)}...`);
    }, 5000);

    debug('awaiting TCP connection to %s:%d', options.address, options.port);
    await isHostConnectable(options.address, options.port);
    clearInterval(interval);
  }

  protected async spawnWrapper(options: T): Promise<void> {
    try {
      return await this.spawn(options);
    } catch (e) {
      if (!(e instanceof ServeCLIProgramNotFoundException)) {
        throw e;
      }

      if (this.global) {
        this.e.log.nl();
        throw new FatalException(`${input(this.pkg)} is required for this command to work properly.`);
      }

      this.e.log.nl();
      this.e.log.info(
        `Looks like ${input(this.pkg)} isn't installed in this project.\n` +
        `This package is required for this command to work properly. The package provides a CLI utility, but the ${input(this.resolvedProgram)} binary was not found in your PATH.`
      );

      const installed = await this.promptToInstall();

      if (!installed) {
        this.e.log.nl();
        throw new FatalException(`${input(this.pkg)} is required for this command to work properly.`);
      }

      return this.spawn(options);
    }
  }

  protected async spawn(options: T): Promise<void> {
    const args = await this.buildArgs(options);
    const p = await this.e.shell.spawn(this.resolvedProgram, args, { stdio: 'pipe', cwd: this.e.project.directory });

    return new Promise<void>((resolve, reject) => {
      const errorHandler = (err: NodeJS.ErrnoException) => {
        debug('received error for %s: %o', this.resolvedProgram, err);

        if (this.resolvedProgram === this.program && err.code === 'ENOENT') {
          p.removeListener('close', closeHandler); // do not exit Ionic CLI, we can gracefully ask to install this CLI
          reject(new ServeCLIProgramNotFoundException(`${strong(this.resolvedProgram)} command not found.`));
        } else {
          reject(err);
        }
      };

      const closeHandler = (code: number | null) => {
        if (code !== null) { // tslint:disable-line:no-null-keyword
          debug('received unexpected close for %s (code: %d)', this.resolvedProgram, code);

          this.e.log.nl();
          this.e.log.error(
            `${input(this.resolvedProgram)} has unexpectedly closed (exit code ${code}).\n` +
            'The Ionic CLI will exit. Please check any output above for error details.'
          );

          processExit(1); // tslint:disable-line:no-floating-promises
        }
      };

      p.on('error', errorHandler);
      p.on('close', closeHandler);

      onBeforeExit(async () => {
        p.removeListener('close', closeHandler);

        if (p.pid) {
          await killProcessTree(p.pid);
        }
      });

      const ws = this.createLoggerStream();

      p.stdout.pipe(split2()).pipe(this.createStreamFilter(line => this.stdoutFilter(line))).pipe(ws);
      p.stderr.pipe(split2()).pipe(this.createStreamFilter(line => this.stderrFilter(line))).pipe(ws);

      this.once('ready', () => {
        resolve();
      });
    });
  }

  protected createLoggerStream(): NodeJS.WritableStream {
    const log = this.e.log.clone();
    log.handlers = createDefaultLoggerHandlers(createPrefixedFormatter(weak(`[${this.resolvedProgram === this.program ? this.prefix : this.resolvedProgram}]`)));
    return log.createWriteStream(LOGGER_LEVELS.INFO);
  }

  protected async resolveProgram(): Promise<string> {
    if (typeof this.script !== 'undefined') {
      debug(`Looking for ${ancillary(this.script)} npm script.`);

      if (await this.resolveScript()) {
        debug(`Using ${ancillary(this.script)} npm script.`);
        return this.e.config.get('npmClient');
      }
    }

    return this.program;
  }

  protected createStreamFilter(filter: (line: string) => boolean): stream.Transform {
    return through2(function(chunk, enc, callback) {
      const str = chunk.toString();

      if (filter(str)) {
        this.push(chunk);
      }

      callback();
    });
  }

  protected async promptToInstall(): Promise<boolean> {
    const { pkgManagerArgs } = await import('./utils/npm');
    const [ manager, ...managerArgs ] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'install', pkg: this.pkg, saveDev: true, saveExact: true });

    this.e.log.nl();

    const confirm = await this.e.prompt({
      name: 'confirm',
      message: `Install ${input(this.pkg)}?`,
      type: 'confirm',
    });

    if (!confirm) {
      this.e.log.warn(`Not installing--here's how to install manually: ${input(`${manager} ${managerArgs.join(' ')}`)}`);
      return false;
    }

    await this.e.shell.run(manager, managerArgs, { cwd: this.e.project.directory });

    return true;
  }
}

abstract class PkgManagerServeCLI extends ServeCLI<ServeOptions> {
  readonly abstract program: NpmClient;
  readonly global = true;
  readonly script = SERVE_SCRIPT;

  protected async resolveProgram(): Promise<string> {
    return this.program;
  }

  protected async buildArgs(options: ServeOptions): Promise<string[]> {
    const { pkgManagerArgs } = await import('./utils/npm');

    // The Ionic CLI decides the host/port of the dev server, so --host and
    // --port are provided to the downstream npm script as a best-effort
    // attempt.
    const args: ParsedArgs = {
      _: [],
      host: options.address,
      port: options.port.toString(),
    };

    const scriptArgs = [...unparseArgs(args), ...options['--'] || []];
    const [ , ...pkgArgs ] = await pkgManagerArgs(this.program, { command: 'run', script: this.script, scriptArgs });

    return pkgArgs;
  }
}

export class NpmServeCLI extends PkgManagerServeCLI {
  readonly name = 'npm CLI';
  readonly pkg = 'npm';
  readonly program = 'npm';
  readonly prefix = 'npm';
}

export class YarnServeCLI extends PkgManagerServeCLI {
  readonly name = 'Yarn';
  readonly pkg = 'yarn';
  readonly program = 'yarn';
  readonly prefix = 'yarn';
}

interface IonicLabServeCLIOptions extends Readonly<LabServeDetails> {
  readonly serveDetails: Readonly<ServeDetails>;
}

class IonicLabServeCLI extends ServeCLI<IonicLabServeCLIOptions> {
  readonly name = 'Ionic Lab';
  readonly pkg = '@ionic/lab';
  readonly program = 'ionic-lab';
  readonly prefix = 'lab';
  readonly script = undefined;

  protected stdoutFilter(line: string): boolean {
    if (line.includes('running')) {
      this.emit('ready');
    }

    return false; // no stdout
  }

  protected async buildArgs(options: IonicLabServeCLIOptions): Promise<string[]> {
    const { serveDetails, ...labDetails } = options;

    const pkg = await this.e.project.requirePackageJson();

    const url = `${serveDetails.protocol}://localhost:${serveDetails.port}`;
    const appName = this.e.project.config.get('name');
    const labArgs = [url, '--host', labDetails.address, '--port', String(labDetails.port), '--project-type', labDetails.projectType];
    const nameArgs = appName ? ['--app-name', appName] : [];
    const versionArgs = pkg.version ? ['--app-version', pkg.version] : [];

    return [...labArgs, ...nameArgs, ...versionArgs];
  }
}

export async function serve(deps: ServeRunnerDeps, inputs: CommandLineInputs, options: CommandLineOptions): Promise<ServeDetails> {
  try {
    const runner = await deps.project.requireServeRunner();

    if (deps.project.details.context === 'multiapp') {
      options['project'] = deps.project.details.id;
    }

    const opts = runner.createOptionsFromCommandLine(inputs, options);
    const details = await runner.run(opts);

    return details;
  } catch (e) {
    if (e instanceof RunnerException) {
      throw new FatalException(e.message);
    }

    throw e;
  }
}
