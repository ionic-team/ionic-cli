import chalk from 'chalk';
import * as Debug from 'debug';
import * as through2 from 'through2';
import * as split2 from 'split2';

import { ParsedArgs, unparseArgs } from '@ionic/cli-framework';
import { str2num } from '@ionic/cli-framework/utils/string';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, IonicAngularServeOptions, ServeDetails } from '../../../definitions';
import { OptionGroup } from '../../../constants';
import { FatalException, ServeCommandNotFoundException } from '../../errors';
import { BIND_ALL_ADDRESS, DEFAULT_DEV_LOGGER_PORT, DEFAULT_LIVERELOAD_PORT, LOCAL_ADDRESSES, SERVE_SCRIPT, ServeRunner as BaseServeRunner } from '../../serve';
import { prettyProjectName } from '../';
import { APP_SCRIPTS_OPTIONS } from './app-scripts';

export const DEFAULT_PROGRAM = 'ionic-app-scripts';
const APP_SCRIPTS_SERVE_CONNECTIVITY_TIMEOUT = 20000; // ms

const debug = Debug('ionic:cli-utils:lib:project:ionic-angular:serve');

interface ServeCmdDetails {
  program: string;
}

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
      ...APP_SCRIPTS_OPTIONS,
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
    const { findClosestOpenPort, isHostConnectable } = await import('../../utils/network');
    const [ externalIP, availableInterfaces ] = await this.selectExternalIP(options);

    const port = await findClosestOpenPort(options.port, '0.0.0.0');
    options.port = port;

    const { program } = await this.serveCommandWrapper(options);

    debug('waiting for connectivity with app-scripts (%dms timeout)', APP_SCRIPTS_SERVE_CONNECTIVITY_TIMEOUT);
    await isHostConnectable('localhost', port, APP_SCRIPTS_SERVE_CONNECTIVITY_TIMEOUT);

    return {
      custom: program !== DEFAULT_PROGRAM,
      protocol: 'http',
      localAddress: 'localhost',
      externalAddress: externalIP,
      externalNetworkInterfaces: availableInterfaces,
      port,
      externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(externalIP),
    };
  }

  private async serveCommandWrapper(options: IonicAngularServeOptions): Promise<ServeCmdDetails> {
    const { promptToInstallPkg } = await import('../../utils/npm');

    try {
      return await this.servecmd(options);
    } catch (e) {
      if (!(e instanceof ServeCommandNotFoundException)) {
        throw e;
      }

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

      return this.servecmd(options);
    }
  }

  private async servecmd(options: IonicAngularServeOptions): Promise<ServeCmdDetails> {
    const { pkgManagerArgs } = await import('../../utils/npm');
    const { registerShutdownFunction } = await import('../../process');

    const config = await this.env.config.load();
    const pkg = await this.env.project.loadPackageJson();
    const { npmClient } = config;

    let program = DEFAULT_PROGRAM;
    let args = await this.serveOptionsToAppScriptsArgs(options);
    const shellOptions = { cwd: this.env.project.directory, env: { FORCE_COLOR: chalk.enabled ? '1' : '0', ...process.env } };

    debug(`Looking for ${chalk.cyan(SERVE_SCRIPT)} npm script.`);

    if (pkg.scripts && pkg.scripts[SERVE_SCRIPT]) {
      if (pkg.scripts[SERVE_SCRIPT] === 'ionic-app-scripts serve') {
        debug(`Found ${chalk.cyan(SERVE_SCRIPT)}, but it is the default. Not running.`);
        args = ['serve', ...args];
      } else {
        debug(`Invoking ${chalk.cyan(SERVE_SCRIPT)} npm script.`);
        const [ pkgManager, ...pkgArgs ] = await pkgManagerArgs({ npmClient, shell: this.env.shell }, { command: 'run', script: SERVE_SCRIPT, scriptArgs: [...args] });
        program = pkgManager;
        args = pkgArgs;
      }
    } else {
      args = ['serve', ...args];
    }

    const p = await this.env.shell.spawn(program, args, shellOptions);

    return new Promise<ServeCmdDetails>((resolve, reject) => {
      p.on('error', (err: NodeJS.ErrnoException) => {
        if (program === DEFAULT_PROGRAM && err.code === 'ENOENT') {
          reject(new ServeCommandNotFoundException(`${chalk.bold(DEFAULT_PROGRAM)} command not found.`));
        } else {
          reject(err);
        }
      });

      registerShutdownFunction(() => p.kill());

      const log = this.env.log.clone({ prefix: chalk.dim(`[${program === DEFAULT_PROGRAM ? 'app-scripts' : program}]`), wrap: false });
      const ws = log.createWriteStream();

      if (program === DEFAULT_PROGRAM) {
        const stdoutFilter = through2(function(chunk, enc, callback) {
          const str = chunk.toString();

          if (str.includes('server running')) {
            resolve({ program }); // TODO: https://github.com/ionic-team/ionic-app-scripts/pull/1372
          } else {
            this.push(chunk);
          }

          callback();
        });

        p.stdout.pipe(split2()).pipe(stdoutFilter).pipe(ws);
        p.stderr.pipe(split2()).pipe(ws);
      } else {
        p.stdout.pipe(split2()).pipe(ws);
        p.stderr.pipe(split2()).pipe(ws);
        resolve({ program });
      }
    });
  }

  async serveOptionsToAppScriptsArgs(options: IonicAngularServeOptions): Promise<string[]> {
    const args: ParsedArgs = {
      _: [],
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
      target: options.engine === 'cordova' ? 'cordova' : undefined,
      env: options.env,
    };

    return [...unparseArgs(args, { useEquals: false }), ...options['--']];
  }
}
