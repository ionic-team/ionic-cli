import * as os from 'os';
import * as path from 'path';

import chalk from 'chalk';
import * as lodash from 'lodash';

import { str2num } from '@ionic/cli-framework/utils/string';
import { fsReadJsonFile } from '@ionic/cli-framework/utils/fs';

import { CommandLineInputs, CommandLineOptions, IonicEnvironment, LabServeDetails, NetworkInterface, ProjectType, ServeDetails, ServeOptions } from '../definitions';
import { isCordovaPackageJson } from '../guards';
import { FatalException } from './errors';
import { PROJECT_FILE } from './project';

export const DEFAULT_DEV_LOGGER_PORT = 53703;
export const DEFAULT_LIVERELOAD_PORT = 35729;
export const DEFAULT_SERVER_PORT = 8100;
export const DEFAULT_LAB_PORT = 8200;

export const BIND_ALL_ADDRESS = '0.0.0.0';
export const LOCAL_ADDRESSES = ['localhost', '127.0.0.1'];

export const BROWSERS = ['safari', 'firefox', process.platform === 'win32' ? 'chrome' : (process.platform === 'darwin' ? 'google chrome' : 'google-chrome')];

const WATCH_BEFORE_HOOK = 'watch:before';
const WATCH_BEFORE_SCRIPT = `ionic:${WATCH_BEFORE_HOOK}`;

export interface DevAppDetails {
  channel?: string;
  port?: number;
  interfaces: {
    address: string;
    broadcast: string;
  }[];
}

export abstract class ServeRunner<T extends ServeOptions> {
  constructor(protected env: IonicEnvironment, public options: T) {}

  abstract serveProject(): Promise<ServeDetails>;

  static async fromProjectType<O extends ServeOptions>(env: IonicEnvironment, options: O, type: ProjectType): Promise<ServeRunner<O>> {
    if (type === 'ionic1') {
      const { Ionic1ServeRunner } = await import('./ionic1/serve');
      return new Ionic1ServeRunner(env, options);
    } else if (type === 'ionic-angular') {
      const { IonicAngularServeRunner } = await import('./ionic-angular/serve');
      return new IonicAngularServeRunner(env, lodash.assign({}, { target: options.iscordovaserve ? 'cordova' : undefined }, options));
    } else if (type === 'ionic-core-angular') {
      const { IonicCoreAngularServeRunner } = await import('./ionic-core-angular/serve');
      return new IonicCoreAngularServeRunner(env, options);
    } else {
      throw new FatalException(
        `Cannot perform Ionic serve for project type: ${chalk.bold(type)}.\n` +
        (type === 'custom' ? `Since you're using the ${chalk.bold('custom')} project type, this command won't work. The Ionic CLI doesn't know how to serve custom projects.\n\n` : '') +
        `If you'd like the CLI to try to detect your project type, you can unset the ${chalk.bold('type')} attribute in ${chalk.bold(PROJECT_FILE)}.`
      );
    }
  }

  static createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): ServeOptions {
    const [ platform ] = inputs;

    if (options['local']) {
      options['address'] = 'localhost';
      options['devapp'] = false;
    }

    const address = options['address'] ? String(options['address']) : BIND_ALL_ADDRESS;
    const port = str2num(options['port'], DEFAULT_SERVER_PORT);
    const livereloadPort = str2num(options['livereload-port'], DEFAULT_LIVERELOAD_PORT);
    const notificationPort = str2num(options['dev-logger-port'], DEFAULT_DEV_LOGGER_PORT);

    return {
      address,
      browser: options['browser'] ? String(options['browser']) : undefined,
      browserOption: options['browseroption'] ? String(options['browseroption']) : undefined,
      consolelogs: options['consolelogs'] ? true : false,
      devapp: typeof options['devapp'] === 'undefined' || options['devapp'] ? true : false,
      env: options['env'] ? String(options['env']) : undefined,
      externalAddressRequired: options['externalAddressRequired'] ? true : false,
      iscordovaserve: typeof options['iscordovaserve'] === 'boolean' ? Boolean(options['iscordovaserve']) : false,
      lab: options['lab'] ? true : false,
      livereload: typeof options['livereload'] === 'boolean' ? Boolean(options['livereload']) : true,
      livereloadPort,
      notificationPort,
      open: options['open'] ? true : false,
      platform,
      port,
      proxy: typeof options['proxy'] === 'boolean' ? Boolean(options['proxy']) : true,
      serverlogs: options['serverlogs'] ? true : false,
    };
  }

  async run(): Promise<ServeDetails> {
    const { findClosestOpenPort } = await import('../lib/utils/network');

    const packageJson = await this.env.project.loadPackageJson();

    if (packageJson.scripts && packageJson.scripts[WATCH_BEFORE_SCRIPT]) {
      this.env.log.debug(() => `Invoking ${chalk.cyan(WATCH_BEFORE_SCRIPT)} npm script.`);
      await this.env.shell.run('npm', ['run', WATCH_BEFORE_SCRIPT], { showExecution: true });
    }

    const deps = lodash.assign({}, packageJson.dependencies, packageJson.devDependencies);

    if (deps['@ionic/cli-plugin-cordova']) {
      const { checkCordova } = await import('../lib/cordova/utils');
      await checkCordova(this.env);
    }

    await this.env.hooks.fire('watch:before', { env: this.env });

    const devAppDetails = await this.gatherDevAppDetails();

    // If this is regular `ionic serve`, we warn the dev about unsupported
    // plugins in the devapp.
    if (this.options.devapp && !this.options.iscordovaserve && isCordovaPackageJson(packageJson)) {
      const plugins = await this.getSupportedDevAppPlugins();
      const packageCordovaPlugins = Object.keys(packageJson.cordova.plugins);
      const packageCordovaPluginsDiff = packageCordovaPlugins.filter(p => !plugins.has(p));

      if (packageCordovaPluginsDiff.length > 0) {
        this.env.log.warn(
          'Detected unsupported Cordova plugins with Ionic DevApp:\n' +
          `${packageCordovaPluginsDiff.map(p => `- ${chalk.bold(p)}`).join('\n')}\n\n` +
          `App may not function as expected in Ionic DevApp and Ionic View.`
        );
      }
    }

    const details = await this.serveProject();

    let labDetails: LabServeDetails | undefined;

    if (this.options.lab) {
      labDetails = {
        protocol: 'http',
        address: 'localhost',
        port: await findClosestOpenPort(DEFAULT_LAB_PORT, '0.0.0.0'),
      };

      await this.runLab(`http://localhost:${details.port}`, labDetails.port);
    }

    if (devAppDetails) {
      const devAppName = await this.publishDevApp({ port: details.port, ...devAppDetails });
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

    if (this.options.open) {
      const openAddress = labAddress ? labAddress : localAddress;
      const openOptions: string[] = [openAddress]
        .concat(this.options.browserOption ? [this.options.browserOption] : [])
        .concat(this.options.platform ? ['?ionicplatform=', this.options.platform] : []);

      const opn = await import('opn');
      opn(openOptions.join(''), { app: this.options.browser, wait: false });
    }

    this.env.keepopen = true;

    return details;
  }

  async gatherDevAppDetails(): Promise<DevAppDetails | undefined> {
    let devAppActive = !this.options.iscordovaserve && this.options.devapp;

    if (devAppActive) {
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

  async publishDevApp(details: DevAppDetails & { port: number; }): Promise<string | undefined> {
    let devAppActive = !this.options.iscordovaserve && this.options.devapp;

    if (devAppActive) {
      const { createPublisher } = await import('./devapp');
      const publisher = await createPublisher(this.env, details.port);
      publisher.interfaces = details.interfaces;

      publisher.on('error', (err: Error) => {
        this.env.log.debug(`Error in DevApp service: ${String(err.stack ? err.stack : err)}`);
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

  async runLab(url: string, port: number) {
    const split2 = await import('split2');
    const { registerShutdownFunction } = await import('./process');

    const project = await this.env.project.load();
    const pkg = await this.env.project.loadPackageJson();

    const labArgs = [url, '--port', String(port)];
    const nameArgs = project.name ? ['--app-name', project.name] : [];
    const versionArgs = pkg.version ? ['--app-version', pkg.version] : [];

    const p = await this.env.shell.spawn('ionic-lab', [...labArgs, ...nameArgs, ...versionArgs], { cwd: this.env.project.directory, env: { FORCE_COLOR: chalk.enabled ? '1' : '0' } });

    registerShutdownFunction(() => p.kill());

    const log = this.env.log.clone({ prefix: chalk.dim('[lab]'), wrap: false });
    const ws = log.createWriteStream();

    p.stderr.pipe(split2()).pipe(ws);
  }

  async selectExternalIP(): Promise<[string, NetworkInterface[]]> {
    const { getSuitableNetworkInterfaces } = await import('./utils/network');

    let availableInterfaces: NetworkInterface[] = [];
    let chosenIP = this.options.address;

    if (this.options.address === BIND_ALL_ADDRESS) {
      availableInterfaces = getSuitableNetworkInterfaces();

      if (availableInterfaces.length === 0) {
        if (this.options.externalAddressRequired) {
          throw new FatalException(
            `No external network interfaces detected. In order to use livereload with run/emulate you will need one.\n` +
            `Are you connected to a local network?\n`
          );
        }
      } else if (availableInterfaces.length === 1) {
        chosenIP = availableInterfaces[0].address;
      } else if (availableInterfaces.length > 1) {
        if (this.options.externalAddressRequired) {
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
