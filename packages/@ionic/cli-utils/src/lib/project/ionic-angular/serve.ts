import chalk from 'chalk';
import * as Debug from 'debug';
import * as through2 from 'through2';
import * as split2 from 'split2';

import { ParsedArgs, unparseArgs } from '@ionic/cli-framework';
import { str2num } from '@ionic/cli-framework/utils/string';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, IonicAngularServeOptions, ServeDetails } from '../../../definitions';
import { OptionGroup } from '../../../constants';
import { FatalException } from '../../errors';
import { BIND_ALL_ADDRESS, DEFAULT_DEV_LOGGER_PORT, DEFAULT_LIVERELOAD_PORT, LOCAL_ADDRESSES, ServeRunner as BaseServeRunner } from '../../serve';
import { prettyProjectName } from '../';

const APP_SCRIPTS_SERVE_CONNECTIVITY_TIMEOUT = 20000; // ms

const debug = Debug('ionic:cli-utils:lib:project:ionic-angular:serve');

export class ServeRunner extends BaseServeRunner<IonicAngularServeOptions> {
  async specializeCommandMetadata(metadata: CommandMetadata): Promise<CommandMetadata> {
    const options = metadata.options ? metadata.options : [];

    options.push(...[
      {
        name: 'consolelogs',
        description: 'Print app console logs to Ionic CLI',
        type: Boolean,
        aliases: ['c'],
      },
      {
        name: 'serverlogs',
        description: 'Print dev server logs to Ionic CLI',
        type: Boolean,
        aliases: ['s'],
        groups: [OptionGroup.Hidden],
      },
      {
        name: 'livereload-port',
        description: 'Use specific port for live-reload',
        default: DEFAULT_LIVERELOAD_PORT.toString(),
        aliases: ['r'],
        groups: [OptionGroup.Advanced],
      },
      {
        name: 'dev-logger-port',
        description: 'Use specific port for dev server communication',
        default: DEFAULT_DEV_LOGGER_PORT.toString(),
        groups: [OptionGroup.Advanced],
      },
    ]);

    return { ...metadata, options };
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): IonicAngularServeOptions {
    const baseOptions = super.createOptionsFromCommandLine(inputs, options);
    const livereloadPort = str2num(options['livereload-port'], DEFAULT_LIVERELOAD_PORT);
    const notificationPort = str2num(options['dev-logger-port'], DEFAULT_DEV_LOGGER_PORT);

    return {
      ...baseOptions,
      consolelogs: options['consolelogs'] ? true : false,
      serverlogs: options['serverlogs'] ? true : false,
      livereloadPort,
      notificationPort,
      env: options['env'] ? String(options['env']) : undefined,
    };
  }

  async serveProject(options: IonicAngularServeOptions): Promise<ServeDetails> {
    const { promptToInstallPkg } = await import('../../utils/npm');
    const { findClosestOpenPort, isHostConnectable } = await import('../../utils/network');
    const [ externalIP, availableInterfaces ] = await this.selectExternalIP(options);

    const appScriptsPort = await findClosestOpenPort(options.port, '0.0.0.0');
    options.port = appScriptsPort;

    try {
      await this.servecmd(options);
    } catch (e) {
      if (e.code === 'ENOENT') {
        const pkg = '@ionic/app-scripts';
        this.env.log.nl();
        this.env.log.warn(
          `Looks like ${chalk.green(pkg)} isn't installed in this project.\n` +
          `This package is required for ${chalk.green('ionic serve')} in ${prettyProjectName('angular')} projects.`
        );

        const installed = await promptToInstallPkg(this.env, { pkg, saveDev: true });

        if (!installed) {
          throw new FatalException(`${chalk.green(pkg)} is required for ${chalk.green('ionic serve')} to work properly.`);
        }

        await this.servecmd(options);
      }
    }

    debug('waiting for connectivity with app scripts (%dms timeout)', APP_SCRIPTS_SERVE_CONNECTIVITY_TIMEOUT);
    await isHostConnectable('localhost', appScriptsPort, APP_SCRIPTS_SERVE_CONNECTIVITY_TIMEOUT);

    return {
      protocol: 'http',
      localAddress: 'localhost',
      externalAddress: externalIP,
      externalNetworkInterfaces: availableInterfaces,
      port: appScriptsPort,
      externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(externalIP),
    };
  }

  async servecmd(options: IonicAngularServeOptions): Promise<void> {
    const { registerShutdownFunction } = await import('../../process');

    const appScriptsArgs = await this.serveOptionsToAppScriptsArgs(options);

    const p = await this.env.shell.spawn('ionic-app-scripts', appScriptsArgs, { cwd: this.env.project.directory, env: { FORCE_COLOR: chalk.enabled ? '1' : '0', ...process.env } });

    return new Promise<void>((resolve, reject) => {
      p.on('error', err => {
        reject(err);
      });

      registerShutdownFunction(() => p.kill());

      const log = this.env.log.clone({ prefix: chalk.dim('[app-scripts]'), wrap: false });
      const ws = log.createWriteStream();

      const stdoutFilter = through2(function(chunk, enc, callback) {
        const str = chunk.toString();

        if (str.includes('server running')) {
          resolve();
        } else {
          this.push(chunk);
        }

        callback();
      });

      p.stdout.pipe(split2()).pipe(stdoutFilter).pipe(ws);
      p.stderr.pipe(split2()).pipe(ws);
    });
  }

  async serveOptionsToAppScriptsArgs(options: IonicAngularServeOptions): Promise<string[]> {
    const args: ParsedArgs = {
      _: ['serve'],
      address: options.address,
      port: String(options.port),
      livereloadPort: String(options.livereloadPort),
      devLoggerPort: String(options.notificationPort),
      consolelogs: options.consolelogs,
      serverlogs: options.serverlogs,
      nobrowser: true,
      nolivereload: !options.livereload,
      noproxy: !options.proxy,
      iscordovaserve: options.engine === 'cordova',
      platform: options.platform,
      target: options.engine,
      env: options.env,
    };

    return [...unparseArgs(args, { useEquals: false }), ...options['--']];
  }
}
