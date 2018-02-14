import * as os from 'os';
import * as path from 'path';

import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';
import * as through2 from 'through2';
import * as split2 from 'split2';

import { onBeforeExit } from '@ionic/cli-framework/utils/process';
import { str2num } from '@ionic/cli-framework/utils/string';
import { fsReadJsonFile } from '@ionic/cli-framework/utils/fs';

import {
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  CommandMetadataOption,
  IonicEnvironment,
  LabServeDetails,
  NetworkInterface,
  ProjectType,
  ServeDetails,
  ServeOptions,
} from '../definitions';

import { isCordovaPackageJson } from '../guards';
import { OptionGroup, PROJECT_FILE } from '../constants';
import { Exception, FatalException, RunnerException, RunnerNotFoundException } from './errors';
import { Runner } from './runner';
import { Hook } from './hooks';

import * as ionic1ServeLibType from './project/ionic1/serve';
import * as ionicAngularServeLibType from './project/ionic-angular/serve';
import * as angularServeLibType from './project/angular/serve';

const debug = Debug('ionic:cli-utils:lib:serve');

export const DEFAULT_DEV_LOGGER_PORT = 53703;
export const DEFAULT_LIVERELOAD_PORT = 35729;
export const DEFAULT_SERVER_PORT = 8100;
export const DEFAULT_LAB_PORT = 8200;

export const BIND_ALL_ADDRESS = '0.0.0.0';
export const LOCAL_ADDRESSES = ['localhost', '127.0.0.1'];

export const BROWSERS = ['safari', 'firefox', process.platform === 'win32' ? 'chrome' : (process.platform === 'darwin' ? 'google chrome' : 'google-chrome')];

// npm script name
export const SERVE_SCRIPT = 'ionic:serve';

export const COMMON_SERVE_COMMAND_OPTIONS: CommandMetadataOption[] = [
  {
    name: 'address',
    description: 'Use specific address for the dev server',
    default: BIND_ALL_ADDRESS,
    groups: [OptionGroup.Advanced],
  },
  {
    name: 'port',
    description: 'Use specific port for HTTP',
    default: DEFAULT_SERVER_PORT.toString(),
    aliases: ['p'],
    groups: [OptionGroup.Advanced],
  },
  {
    name: 'livereload',
    description: 'Do not spin up dev server--just serve files',
    type: Boolean,
    default: true,
  },
  {
    name: 'proxy',
    description: 'Do not add proxies',
    type: Boolean,
    default: true,
    groups: [OptionGroup.Advanced],
    // TODO: Adding 'x' to aliases here has some weird behavior with minimist.
  },
];

export interface DevAppDetails {
  channel?: string;
  port?: number;
  interfaces: {
    address: string;
    broadcast: string;
  }[];
}

export abstract class ServeRunner<T extends ServeOptions> extends Runner<T, ServeDetails> {
  constructor(protected env: IonicEnvironment) {
    super();
  }

  static async createFromProjectType(env: IonicEnvironment, type: 'ionic1'): Promise<ionic1ServeLibType.ServeRunner>;
  static async createFromProjectType(env: IonicEnvironment, type: 'ionic-angular'): Promise<ionicAngularServeLibType.ServeRunner>;
  static async createFromProjectType(env: IonicEnvironment, type: 'angular'): Promise<angularServeLibType.ServeRunner>;
  static async createFromProjectType(env: IonicEnvironment, type?: ProjectType): Promise<ServeRunner<any>>;
  static async createFromProjectType(env: IonicEnvironment, type?: ProjectType): Promise<ServeRunner<any>> {
    if (type === 'ionic1') {
      const { ServeRunner } = await import('./project/ionic1/serve');
      return new ServeRunner(env);
    } else if (type === 'ionic-angular') {
      const { ServeRunner } = await import('./project/ionic-angular/serve');
      return new ServeRunner(env);
    } else if (type === 'angular') {
      const { ServeRunner } = await import('./project/angular/serve');
      return new ServeRunner(env);
    } else {
      throw new RunnerNotFoundException(
        `Cannot perform serve for ${type ? '' : 'unknown '}project type${type ? `: ${chalk.bold(type)}` : ''}.\n` +
        (type === 'custom' ? `Since you're using the ${chalk.bold('custom')} project type, this command won't work. The Ionic CLI doesn't know how to serve custom projects.\n\n` : '') +
        `If you'd like the CLI to try to detect your project type, you can unset the ${chalk.bold('type')} attribute in ${chalk.bold(PROJECT_FILE)}.`
      );
    }
  }

  abstract getCommandMetadata(): Promise<Partial<CommandMetadata>>;
  abstract serveProject(options: T): Promise<ServeDetails>;

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): ServeOptions {
    const separatedArgs = options['--'];

    if (options['local']) {
      options['address'] = 'localhost';
      options['devapp'] = false;
    }

    const engine = options['engine'] ? String(options['engine']) : 'browser';
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
      port,
      platform: options['platform'] ? String(options['platform']) : undefined,
      proxy: typeof options['proxy'] === 'boolean' ? Boolean(options['proxy']) : true,
    };
  }

  async checkDevApp(options: T) {
    const pkg = await this.env.project.loadPackageJson();

    // If this is regular `ionic serve`, we warn the dev about unsupported
    // plugins in the devapp.
    if (options.devapp && isCordovaPackageJson(pkg)) {
      const plugins = await this.getSupportedDevAppPlugins();
      const packageCordovaPlugins = Object.keys(pkg.cordova.plugins);
      const packageCordovaPluginsDiff = packageCordovaPlugins.filter(p => !plugins.has(p));

      if (packageCordovaPluginsDiff.length > 0) {
        this.env.log.warn(
          'Detected unsupported Cordova plugins with Ionic DevApp:\n' +
          `${packageCordovaPluginsDiff.map(p => `- ${chalk.bold(p)}`).join('\n')}\n\n` +
          `App may not function as expected in Ionic DevApp and Ionic View.`
        );
      }
    }
  }

  async run(options: T): Promise<ServeDetails> {
    const { promptToInstallPkg } = await import('./utils/npm');
    const { findClosestOpenPort } = await import('./utils/network');

    const before = new ServeBeforeHook(this.env);

    try {
      await before.run({ name: before.name, serve: options });
    } catch (e) {
      if (e instanceof Exception) {
        throw new FatalException(e.message);
      }

      throw e;
    }

    await this.checkDevApp(options);

    const devAppDetails = await this.gatherDevAppDetails(options);
    const details = await this.serveProject(options);

    let labDetails: LabServeDetails | undefined;

    if (options.lab) {
      labDetails = {
        protocol: 'http',
        address: options.labHost,
        port: await findClosestOpenPort(options.labPort, '0.0.0.0'),
      };

      try {
        await this.runLab(`http://localhost:${details.port}`, labDetails);
      } catch (e) {
        if (e.code === 'ENOENT') {
          const pkg = '@ionic/lab';
          this.env.log.nl();
          this.env.log.warn(
            `Looks like ${chalk.green(pkg)} isn't installed in this project.\n` +
            `This package is required for Ionic Lab as of CLI 4.0. For more details, please see the CHANGELOG: ${chalk.bold('https://github.com/ionic-team/ionic-cli/blob/master/CHANGELOG.md#4.0.0')}`
          );

          const installed = await promptToInstallPkg(this.env, { pkg, saveDev: true });

          if (!installed) {
            throw new FatalException(`${chalk.green(pkg)} is required for Ionic Lab to work properly.`);
          }

          await this.runLab(`http://localhost:${details.port}`, labDetails);
        }
      }
    }

    if (devAppDetails) {
      const devAppName = await this.publishDevApp(options, { port: details.port, ...devAppDetails });
      devAppDetails.channel = devAppName;
    }

    const localAddress = `${details.protocol}://localhost:${details.port}`;
    const fmtExternalAddress = (address: string) => `${details.protocol}://${address}:${details.port}`;
    const labAddress = labDetails ? `${labDetails.protocol}://${labDetails.address}:${labDetails.port}` : undefined;

    this.env.log.nl();
    this.env.log.ok(
      `Development server running!\n` +
      (labAddress ? `Lab: ${chalk.bold(labAddress)}\n` : '') +
      `Local: ${chalk.bold(localAddress)}\n` +
      (details.externalNetworkInterfaces.length > 0 ? `External: ${details.externalNetworkInterfaces.map(v => chalk.bold(fmtExternalAddress(v.address))).join(', ')}\n` : '') +
      (devAppDetails && devAppDetails.channel ? `DevApp: ${chalk.bold(devAppDetails.channel)} on ${chalk.bold(os.hostname())}` : '')
    );
    this.env.log.nl();

    if (options.open) {
      const openAddress = labAddress ? labAddress : localAddress;
      const openURL = [openAddress]
        .concat(options.browserOption ? [options.browserOption] : [])
        .concat(options.platform ? ['?ionicplatform=', options.platform] : [])
        .join('');

      const opn = await import('opn');
      opn(openURL, { app: options.browser, wait: false });

      this.env.log.info(`Browser window opened to ${chalk.bold(openURL)}!`);
      this.env.log.nl();
    }

    onBeforeExit(async () => {
      const after = new ServeAfterHook(this.env);

      try {
        await after.run({ name: after.name, serve: lodash.assign({}, options, details) });
      } catch (e) {
        if (e instanceof Exception) {
          throw new FatalException(e.message);
        }

        throw e;
      }
    });

    this.env.keepopen = true;

    return details;
  }

  async gatherDevAppDetails(options: T): Promise<DevAppDetails | undefined> {
    if (options.devapp) {
      const { getSuitableNetworkInterfaces } = await import('./utils/network');
      const { computeBroadcastAddress } = await import('./devapp');

      const availableInterfaces = getSuitableNetworkInterfaces();

      // TODO: There is no accurate/reliable/realistic way to identify a WiFi
      // network uniquely in NodeJS. But this is where we could detect new
      // networks and prompt the dev if they want to "trust" it (allow binding to
      // 0.0.0.0 and broadcasting).

      const interfaces = availableInterfaces
        .map(i => ({
          ...i,
          broadcast: computeBroadcastAddress(i.address, i.netmask),
        }));

      return { interfaces };
    }
  }

  async publishDevApp(options: T, details: DevAppDetails & { port: number; }): Promise<string | undefined> {
    if (options.devapp) {
      const { createPublisher } = await import('./devapp');
      const publisher = await createPublisher(this.env, details.port);
      publisher.interfaces = details.interfaces;

      publisher.on('error', (err: Error) => {
        debug(`Error in DevApp service: ${String(err.stack ? err.stack : err)}`);
      });

      try {
        await publisher.start();
      } catch (e) {
        this.env.log.error(`Could not publish DevApp service: ${String(e.stack ? e.stack : e)}`);
      }

      return publisher.name;
    }
  }

  async getSupportedDevAppPlugins(): Promise<Set<string>> {
    const p = path.resolve(__dirname, '..', 'assets', 'devapp', 'plugins.json');
    const plugins = await fsReadJsonFile(p);

    if (!Array.isArray(plugins)) {
      throw new Error(`Cannot read ${p} file of supported plugins.`);
    }

    // This one is common, and hopefully obvious enough that the devapp doesn't
    // use any splash screen but its own, so we mark it as "supported".
    plugins.push('cordova-plugin-splashscreen');

    return new Set(plugins);
  }

  async runLab(url: string, details: LabServeDetails) {
    const project = await this.env.project.load();
    const pkg = await this.env.project.loadPackageJson();

    const labArgs = [url, '--host', details.address, '--port', String(details.port)];
    const nameArgs = project.name ? ['--app-name', project.name] : [];
    const versionArgs = pkg.version ? ['--app-version', pkg.version] : [];

    const p = await this.env.shell.spawn('ionic-lab', [...labArgs, ...nameArgs, ...versionArgs], { cwd: this.env.project.directory, env: { FORCE_COLOR: chalk.enabled ? '1' : '0', ...process.env } });

    return new Promise<void>((resolve, reject) => {
      p.on('error', err => {
        reject(err);
      });

      onBeforeExit(async () => p.kill());

      const log = this.env.log.clone({ prefix: chalk.dim('[lab]'), wrap: false });
      const ws = log.createWriteStream();

      const stdoutFilter = through2(function(chunk, enc, callback) {
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

  async selectExternalIP(options: T): Promise<[string, NetworkInterface[]]> {
    const { getSuitableNetworkInterfaces } = await import('./utils/network');

    let availableInterfaces: NetworkInterface[] = [];
    let chosenIP = options.address;

    if (options.address === BIND_ALL_ADDRESS) {
      availableInterfaces = getSuitableNetworkInterfaces();

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
          this.env.log.warn(
            'Multiple network interfaces detected!\n' +
            'You will be prompted to select an external-facing IP for the livereload server that your device or emulator has access to.\n\n' +
            `You may also use the ${chalk.green('--address')} option to skip this prompt.`
          );

          const promptedIp = await this.env.prompt({
            type: 'list',
            name: 'promptedIp',
            message: 'Please select which IP to use:',
            choices: availableInterfaces.map(i => ({
              name: `${i.address} ${chalk.dim(`(${i.deviceName})`)}`,
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
    const runner = await ServeRunner.createFromProjectType(env, env.project.type);
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
