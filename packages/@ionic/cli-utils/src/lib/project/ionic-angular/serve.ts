import chalk from 'chalk';
import * as Debug from 'debug';
import * as through2 from 'through2';
import * as split2 from 'split2';

import { LOGGER_LEVELS, ParsedArgs, unparseArgs } from '@ionic/cli-framework';
import { onBeforeExit } from '@ionic/cli-framework/utils/process';
import { str2num } from '@ionic/cli-framework/utils/string';
import { isHostConnectable } from '@ionic/cli-framework/utils/network';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, IonicAngularServeOptions, ServeDetails } from '../../../definitions';
import { OptionGroup } from '../../../constants';
import { FatalException, ServeCommandNotFoundException } from '../../errors';
import { createFormatter } from '../../utils/logger';
import { BIND_ALL_ADDRESS, DEFAULT_DEV_LOGGER_PORT, DEFAULT_LIVERELOAD_PORT, LOCAL_ADDRESSES, SERVE_SCRIPT, ServeRunner as BaseServeRunner } from '../../serve';
import { prettyProjectName } from '../';
import { APP_SCRIPTS_OPTIONS } from './app-scripts';
import { findOpenIonicPorts } from '../common';

const debug = Debug('ionic:cli-utils:lib:project:ionic-angular:serve');

export const DEFAULT_PROGRAM = 'ionic-app-scripts';
export const DEFAULT_SERVE_SCRIPT_VALUE = `${DEFAULT_PROGRAM} serve`;
const APP_SCRIPTS_SERVE_CONNECTIVITY_TIMEOUT = 20000; // ms

interface ServeCmdDetails {
  program: string;
}

export class ServeRunner extends BaseServeRunner<IonicAngularServeOptions> {
  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {
      options: [
        {
          name: 'consolelogs',
          summary: 'Print app console logs to Ionic CLI',
          type: Boolean,
          aliases: ['c'],
        },
        {
          name: 'serverlogs',
          summary: 'Print dev server logs to Ionic CLI',
          type: Boolean,
          aliases: ['s'],
          groups: [OptionGroup.Hidden],
        },
        {
          name: 'livereload-port',
          summary: 'Use specific port for live-reload',
          default: DEFAULT_LIVERELOAD_PORT.toString(),
          aliases: ['r'],
          groups: [OptionGroup.Advanced],
        },
        {
          name: 'dev-logger-port',
          summary: 'Use specific port for dev server communication',
          default: DEFAULT_DEV_LOGGER_PORT.toString(),
          groups: [OptionGroup.Advanced],
        },
        ...APP_SCRIPTS_OPTIONS,
      ],
    };
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
    const [ externalIP, availableInterfaces ] = await this.selectExternalIP(options);
    const { port, livereloadPort, notificationPort } = await findOpenIonicPorts(options.address, options);

    options.port = port;
    options.livereloadPort = livereloadPort;
    options.notificationPort = notificationPort;

    const { program } = await this.serveCommandWrapper(options);

    debug(`waiting for connectivity with ${program} (${APP_SCRIPTS_SERVE_CONNECTIVITY_TIMEOUT}ms timeout)`);
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
    try {
      return await this.servecmd(options);
    } catch (e) {
      if (!(e instanceof ServeCommandNotFoundException)) {
        throw e;
      }

      const pkg = '@ionic/app-scripts';
      this.log.nl();

      throw new FatalException(
        `${chalk.green(pkg)} is required for ${chalk.green('ionic serve')} to work properly.\n` +
        `Looks like ${chalk.green(pkg)} isn't installed in this project.\n\n` +
        `This package is required for ${chalk.green('ionic serve')} in ${prettyProjectName('angular')} projects.`
      );
    }
  }

  private async servecmd(options: IonicAngularServeOptions): Promise<ServeCmdDetails> {
    const { pkgManagerArgs } = await import('../../utils/npm');

    const config = await this.config.load();
    const pkg = await this.project.requirePackageJson();
    const { npmClient } = config;

    let program = DEFAULT_PROGRAM;
    let args = await this.serveOptionsToAppScriptsArgs(options);
    const shellOptions = { cwd: this.project.directory };

    debug(`Looking for ${chalk.cyan(SERVE_SCRIPT)} npm script.`);

    if (pkg.scripts && pkg.scripts[SERVE_SCRIPT]) {
      if (pkg.scripts[SERVE_SCRIPT] === DEFAULT_SERVE_SCRIPT_VALUE) {
        debug(`Found ${chalk.cyan(SERVE_SCRIPT)}, but it is the default. Not running.`);
        args = ['serve', ...args];
      } else {
        debug(`Invoking ${chalk.cyan(SERVE_SCRIPT)} npm script.`);
        const [ pkgManager, ...pkgArgs ] = await pkgManagerArgs(npmClient, { command: 'run', script: SERVE_SCRIPT, scriptArgs: [...args] });
        program = pkgManager;
        args = pkgArgs;
      }
    } else {
      args = ['serve', ...args];
    }

    const p = await this.shell.spawn(program, args, shellOptions);

    return new Promise<ServeCmdDetails>((resolve, reject) => {
      p.on('error', (err: NodeJS.ErrnoException) => {
        if (program === DEFAULT_PROGRAM && err.code === 'ENOENT') {
          reject(new ServeCommandNotFoundException(`${chalk.bold(DEFAULT_PROGRAM)} command not found.`));
        } else {
          reject(err);
        }
      });

      onBeforeExit(async () => p.kill());

      const log = this.log.clone();
      log.setFormatter(createFormatter({ prefix: chalk.dim(`[${program === DEFAULT_PROGRAM ? 'app-scripts' : program}]`), wrap: false }));
      const ws = log.createWriteStream(LOGGER_LEVELS.INFO, false);

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
