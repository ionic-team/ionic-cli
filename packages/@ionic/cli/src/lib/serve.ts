import { BaseError, MetadataGroup, ParsedArgs, unparseArgs } from '@ionic/cli-framework';
import { LOGGER_LEVELS, createPrefixedFormatter } from '@ionic/cli-framework-output';
import { PromptModule } from '@ionic/cli-framework-prompts';
import { str2num } from '@ionic/cli-framework/utils/string';
import { NetworkInterface, getExternalIPv4Interfaces, isHostConnectable } from '@ionic/utils-network';
import { createProcessEnv, killProcessTree, onBeforeExit, processExit } from '@ionic/utils-process';
import chalk from 'chalk';
import { debug as Debug } from 'debug';
import { EventEmitter } from 'events';
import * as lodash from 'lodash';
import split2 from 'split2';
import * as stream from 'stream';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, CommandMetadataOption, IConfig, ILogger, IProject, IShell, IonicEnvironmentFlags, NpmClient, Runner, ServeDetails, ServeOptions } from '../definitions';

import { ancillary, input, strong, weak } from './color';
import { FatalException, ServeCLIProgramNotFoundException } from './errors';
import { emit } from './events';
import { Hook } from './hooks';
import { openUrl } from './open';
import { createDefaultLoggerHandlers } from './utils/logger';

const debug = Debug('ionic:lib:serve');

export const DEFAULT_DEV_LOGGER_PORT = 53703;
export const DEFAULT_LIVERELOAD_PORT = 35729;
export const DEFAULT_SERVER_PORT = 8100;
export const DEFAULT_DEVAPP_COMM_PORT = 53233;

export const DEFAULT_ADDRESS = 'localhost';
export const BIND_ALL_ADDRESS = '0.0.0.0';
export const LOCAL_ADDRESSES = ['localhost', '127.0.0.1'];

export const BROWSERS = ['safari', 'firefox', process.platform === 'win32' ? 'chrome' : (process.platform === 'darwin' ? 'google chrome' : 'google-chrome')];

// npm script name
export const SERVE_SCRIPT = 'ionic:serve';

export const COMMON_SERVE_COMMAND_OPTIONS: readonly CommandMetadataOption[] = [
  {
    name: 'external',
    summary: `Host dev server on all network interfaces (i.e. ${input('--host=0.0.0.0')})`,
    type: Boolean,
  },
  {
    name: 'address', // keep this here so the option is parsed with its value
    summary: '',
    groups: [MetadataGroup.HIDDEN],
  },
  {
    name: 'host',
    summary: 'Use specific host for the dev server',
    default: DEFAULT_ADDRESS,
    groups: [MetadataGroup.ADVANCED],
  },
  {
    name: 'port',
    summary: 'Use specific port for the dev server',
    default: DEFAULT_SERVER_PORT.toString(),
    aliases: ['p'],
    groups: [MetadataGroup.ADVANCED],
  },
  {
    name: 'public-host',
    summary: 'The host used for the browser or web view',
    groups: [MetadataGroup.ADVANCED],
    spec: { value: 'host' },
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
  abstract modifyOpenUrl(url: string, options: T): string;

  getPkgManagerServeCLI(): PkgManagerServeCLI {
    const pkgManagerCLIs = {
      npm: NpmServeCLI,
      pnpm: PnpmServeCLI,
      yarn: YarnServeCLI,
      bun: BunServeCLI,
    };

    const client = this.e.config.get('npmClient');
    const CLI = pkgManagerCLIs[client];

    if (CLI) {
      return new CLI(this.e);
    }

    throw new ServeCLIProgramNotFoundException('Unknown CLI client: ' + client);
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): ServeOptions {
    const separatedArgs = options['--'];

    if (options['external'] && options['host'] === DEFAULT_ADDRESS) {
      options['host'] = '0.0.0.0';
    }

    if (options['address'] && options['host'] === DEFAULT_ADDRESS) {
      this.e.log.warn(
        `The ${input('--address')} option is deprecated in favor of ${input('--host')}.\n` +
        `Please use the ${input('--host')} option (e.g. ${input(`--host=${options['address']}`)}) to specify the host of the dev server.\n`
      );

      options['host'] = options['address'];
    }

    const engine = this.determineEngineFromCommandLine(options);
    const host = options['host'] ? String(options['host']) : DEFAULT_ADDRESS;
    const port = str2num(options['port'], DEFAULT_SERVER_PORT);
    const [platform] = options['platform'] ? [String(options['platform'])] : inputs;

    return {
      '--': separatedArgs ? separatedArgs : [],
      host,
      browser: options['browser'] ? String(options['browser']) : undefined,
      browserOption: options['browseroption'] ? String(options['browseroption']) : undefined,
      engine,
      externalAddressRequired: !!options['externalAddressRequired'],
      livereload: typeof options['livereload'] === 'boolean' ? Boolean(options['livereload']) : true,
      open: !!options['open'],
      platform,
      port,
      proxy: typeof options['proxy'] === 'boolean' ? Boolean(options['proxy']) : true,
      project: options['project'] ? String(options['project']) : undefined,
      publicHost: options['public-host'] ? String(options['public-host']) : undefined,
      verbose: !!options['verbose'],
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

  async beforeServe(options: T) {
    const hook = new ServeBeforeHook(this.e);

    try {
      await hook.run({ name: hook.name, serve: options });
    } catch (e: any) {
      if (e instanceof BaseError) {
        throw new FatalException(e.message);
      }

      throw e;
    }
  }

  async run(options: T): Promise<ServeDetails> {
    debug('serve options: %O', options);

    await this.beforeServe(options);

    const details = await this.serveProject(options);

    const localAddress = `${details.protocol}://${options.publicHost ? options.publicHost : 'localhost'}:${details.port}`;
    const fmtExternalAddress = (host: string) => `${details.protocol}://${host}:${details.port}`;

    this.e.log.nl();
    this.e.log.info(
      `Development server running!` +
      `\nLocal: ${strong(localAddress)}` +
      (details.externalNetworkInterfaces.length > 0 ? `\nExternal: ${details.externalNetworkInterfaces.map(v => strong(fmtExternalAddress(v.address))).join(', ')}` : '') +
      `\n\n${chalk.yellow('Use Ctrl+C to quit this process')}`
    );
    this.e.log.nl();

    if (options.open) {
      const openAddress = localAddress;
      const url = this.modifyOpenUrl(openAddress, options);

      await openUrl(url, { app: options.browser });

      this.e.log.info(`Browser window opened to ${strong(url)}!`);
      this.e.log.nl();
    }

    emit('serve:ready', details);
    debug('serve details: %O', details);

    this.scheduleAfterServe(options, details);

    return details;
  }

  async afterServe(options: T, details: ServeDetails) {
    const hook = new ServeAfterHook(this.e);

    try {
      await hook.run({ name: hook.name, serve: lodash.assign({}, options, details) });
    } catch (e: any) {
      if (e instanceof BaseError) {
        throw new FatalException(e.message);
      }

      throw e;
    }
  }

  scheduleAfterServe(options: T, details: ServeDetails) {
    onBeforeExit(async () => this.afterServe(options, details));
  }

  getUsedPorts(options: T, details: ServeDetails): number[] {
    return [details.port];
  }

  async selectExternalIP(options: T): Promise<[string, NetworkInterface[]]> {
    let availableInterfaces: NetworkInterface[] = [];
    let chosenIP = options.host;

    if (options.host === BIND_ALL_ADDRESS) {
      // ignore link-local addresses
      availableInterfaces = getExternalIPv4Interfaces().filter(i => !i.address.startsWith('169.254'));

      if (options.publicHost) {
        chosenIP = options.publicHost;
      } else {
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
                `You will be prompted to select an external-facing IP for the dev server that your device or emulator can access. Make sure your device is on the same Wi-Fi network as your computer. Learn more about Live Reload in the docs${ancillary('[1]')}.\n\n` +
                `To bypass this prompt, use the ${input('--public-host')} option (e.g. ${input(`--public-host=${availableInterfaces[0].address}`)}). You can alternatively bind the dev server to a specific IP (e.g. ${input(`--host=${availableInterfaces[0].address}`)}).\n\n` +
                `${ancillary('[1]')}: ${strong('https://ion.link/livereload-docs')}\n`
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
                `You must select an external-facing IP for the dev server that your device or emulator can access with the ${input('--public-host')} option.`
              );
            }
          }
        }
      }
    } else if (options.externalAddressRequired && LOCAL_ADDRESSES.includes(options.host)) {
      this.e.log.warn(
        'An external host may be required to serve for this target device/platform.\n' +
        'If you get connection issues on your device or emulator, try connecting the device to the same Wi-Fi network and selecting an accessible IP address for your computer on that network.\n\n' +
        `You can use ${input('--external')} to run the dev server on all network interfaces, in which case an external address will be selected.\n`
      );
    }

    return [chosenIP, availableInterfaces];
  }
}

class ServeBeforeHook extends Hook {
  readonly name = 'serve:before';
}

class ServeAfterHook extends Hook {
  readonly name = 'serve:after';
}

export interface ServeCLIOptions {
  readonly host: string;
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
   * Build the environment variables to be passed to the Serve CLI. Called by `this.start()`;
   */
  protected async buildEnvVars(options: T): Promise<NodeJS.ProcessEnv> {
    return process.env;
  }

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

    const [pkg] = await this.e.project.getPackageJson(undefined, { logErrors: false });

    if (!pkg) {
      return;
    }

    return pkg.scripts && pkg.scripts[this.script];
  }

  async serve(options: T): Promise<void> {
    this._resolvedProgram = await this.resolveProgram();

    await this.spawnWrapper(options);

    const interval = setInterval(() => {
      this.e.log.info(`Waiting for connectivity with ${input(this.resolvedProgram)}...`);
    }, 5000);

    debug('awaiting TCP connection to %s:%d', options.host, options.port);
    await isHostConnectable(options.host, options.port);
    clearInterval(interval);
  }

  protected async spawnWrapper(options: T): Promise<void> {
    try {
      return await this.spawn(options);
    } catch (e: any) {
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
    const env = await this.buildEnvVars(options);
    const p = await this.e.shell.spawn(this.resolvedProgram, args, { stdio: ['inherit', 'pipe', 'pipe'], cwd: this.e.project.directory, env: createProcessEnv(env) });

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
        if (code !== null) {
          debug('received unexpected close for %s (code: %d)', this.resolvedProgram, code);

          this.e.log.nl();
          this.e.log.error(
            `${input(this.resolvedProgram)} has unexpectedly closed (exit code ${code}).\n` +
            'The Ionic CLI will exit. Please check any output above for error details.'
          );

          processExit(1);
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

      p.stdout?.pipe(split2()).pipe(this.createStreamFilter(line => this.stdoutFilter(line))).pipe(ws);
      p.stderr?.pipe(split2()).pipe(this.createStreamFilter(line => this.stderrFilter(line))).pipe(ws);

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
    return new stream.Transform({
      transform(chunk, enc, callback) {
        const str = chunk.toString();

        if (filter(str)) {
          this.push(chunk);
        }

        callback();
      },
    });
  }

  protected async promptToInstall(): Promise<boolean> {
    const { pkgManagerArgs } = await import('./utils/npm');
    const [manager, ...managerArgs] = await pkgManagerArgs(this.e.config.get('npmClient'), { command: 'install', pkg: this.pkg, saveDev: true, saveExact: true });

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
      host: options.host,
      port: options.port.toString(),
    };

    const scriptArgs = [...unparseArgs(args), ...options['--'] || []];
    const [, ...pkgArgs] = await pkgManagerArgs(this.program, { command: 'run', script: this.script, scriptArgs });

    return pkgArgs;
  }
}

export class NpmServeCLI extends PkgManagerServeCLI {
  readonly name = 'npm CLI';
  readonly pkg = 'npm';
  readonly program = 'npm';
  readonly prefix = 'npm';
}

export class PnpmServeCLI extends PkgManagerServeCLI {
  readonly name = 'pnpm CLI';
  readonly pkg = 'pnpm';
  readonly program = 'pnpm';
  readonly prefix = 'pnpm';
}

export class YarnServeCLI extends PkgManagerServeCLI {
  readonly name = 'Yarn';
  readonly pkg = 'yarn';
  readonly program = 'yarn';
  readonly prefix = 'yarn';
}

export class BunServeCLI extends PkgManagerServeCLI {
  readonly name = 'Bun';
  readonly pkg = 'bun';
  readonly program = 'bun';
  readonly prefix = 'bun';
}
