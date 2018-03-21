import * as path from 'path';

import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';
import * as through2 from 'through2';
import * as split2 from 'split2';
import * as proxyMiddlewareType from 'http-proxy-middleware'; // tslint:disable-line:no-implicit-dependencies

import { onBeforeExit } from '@ionic/cli-framework/utils/process';
import { str2num } from '@ionic/cli-framework/utils/string';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, Ionic1ServeOptions, ProjectFileProxy, ServeDetails } from '../../../definitions';
import { OptionGroup } from '../../../constants';
import { FatalException, ServeCommandNotFoundException } from '../../errors';
import { BIND_ALL_ADDRESS, DEFAULT_DEV_LOGGER_PORT, DEFAULT_LIVERELOAD_PORT, LOCAL_ADDRESSES, SERVE_SCRIPT, ServeRunner as BaseServeRunner } from '../../serve';

export const DEFAULT_PROGRAM = 'ionic-v1';
const IONIC_V1_SERVE_CONNECTIVITY_TIMEOUT = 5000; // ms

const debug = Debug('ionic:cli-utils:lib:project:ionic1');

const WATCH_PATTERNS = [
  'scss/**/*',
  'www/**/*',
  '!www/lib/**/*',
  '!www/**/*.map',
];

interface Ports {
  port: number;
  livereloadPort: number;
  notificationPort: number;
}

interface ProxyConfig extends proxyMiddlewareType.Config {
  mount: string;
}

interface ServeMetaOptions extends Ionic1ServeOptions {
  wwwDir: string;
  watchPatterns: string[];
  proxies: ProxyConfig[];
}

interface ServeCmdDetails {
  program: string;
}

function proxyConfigToMiddlewareConfig(proxy: ProjectFileProxy): proxyMiddlewareType.Config {
  const config: proxyMiddlewareType.Config = {
    pathRewrite: { [proxy.path]: '' },
    target: proxy.proxyUrl,
  };

  if (proxy.proxyNoAgent) {
    config.agent = <any>false; // TODO: type issue
  }

  if (proxy.rejectUnauthorized === false) {
    config.secure = false;
  }

  return config;
}

export class ServeRunner extends BaseServeRunner<Ionic1ServeOptions> {
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
      ],
    };
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): Ionic1ServeOptions {
    const baseOptions = super.createOptionsFromCommandLine(inputs, options);
    const livereloadPort = str2num(options['livereload-port'], DEFAULT_LIVERELOAD_PORT);
    const notificationPort = str2num(options['dev-logger-port'], DEFAULT_DEV_LOGGER_PORT);

    return {
      ...baseOptions,
      consolelogs: options['consolelogs'] ? true : false,
      serverlogs: options['serverlogs'] ? true : false,
      livereloadPort,
      notificationPort,
    };
  }

  async serveProject(options: Ionic1ServeOptions): Promise<ServeDetails> {
    const { isHostConnectable } = await import('../../utils/network');

    const [ externalIP, availableInterfaces ] = await this.selectExternalIP(options);
    const { port, livereloadPort, notificationPort } = await this.findOpenPorts(options.address, options);

    options.port = port;
    options.livereloadPort = livereloadPort;
    options.notificationPort = notificationPort;

    const details = [
      `address: ${chalk.bold(options.address)}`,
      `port: ${chalk.bold(String(port))}`,
      `dev server port: ${chalk.bold(String(notificationPort))}`,
    ];

    if (options.livereload) {
      details.push(`livereload port: ${chalk.bold(String(livereloadPort))}`);
    }

    const { program } = await this.serveCommandWrapper(options);

    debug('waiting for connectivity with ionic-v1 (%dms timeout)', IONIC_V1_SERVE_CONNECTIVITY_TIMEOUT);
    await isHostConnectable('localhost', port, IONIC_V1_SERVE_CONNECTIVITY_TIMEOUT);

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

  private async serveCommandWrapper(options: Ionic1ServeOptions): Promise<ServeCmdDetails> {
    const project = await this.project.load();
    const wwwDir = await this.project.getSourceDir();
    const proxies = project.proxies && options.proxy ? project.proxies.map(p => ({ mount: p.path, ...proxyConfigToMiddlewareConfig(p) })) : [];

    if (!project.watchPatterns || project.watchPatterns.length === 1 && project.watchPatterns[0] === 'scss/**/*') {
      project.watchPatterns = WATCH_PATTERNS;
    }

    debug(`Watch patterns: ${project.watchPatterns.map(v => chalk.bold(v)).join(', ')}`);

    const cmdopts = lodash.assign({ wwwDir, watchPatterns: project.watchPatterns, proxies }, options);

    try {
      return await this.servecmd(cmdopts);
    } catch (e) {
      if (!(e instanceof ServeCommandNotFoundException)) {
        throw e;
      }

      const pkg = '@ionic/v1-toolkit';
      this.log.nl();

      throw new FatalException(
        `${chalk.green(pkg)} is required for ${chalk.green('ionic serve')} to work properly.\n` +
        `Looks like ${chalk.green(pkg)} isn't installed in this project.\n` +
        `This package is required for ${chalk.green('ionic serve')} as of CLI 4.0. For more details, please see the CHANGELOG: ${chalk.bold('https://github.com/ionic-team/ionic-cli/blob/master/CHANGELOG.md#4.0.0')}`
      );
    }
  }

  private async servecmd(options: ServeMetaOptions): Promise<ServeCmdDetails> {
    const { pkgManagerArgs } = await import('../../utils/npm');

    const config = await this.config.load();
    const pkg = await this.project.loadPackageJson();
    const { npmClient } = config;
    const workingDir = this.project.directory;

    const networkArgs = ['--host', options.address, '--port', String(options.port), '--lr-port', String(options.livereloadPort), '--dev-port', String(options.notificationPort)];
    const watchPatternsArgs = lodash.flatten(options.watchPatterns.map(p => ['-w', p]));
    const proxiesArgs = lodash.flatten(options.proxies.map(p => ['-p', JSON.stringify(p)]));

    let program = DEFAULT_PROGRAM;
    let args = [...networkArgs, ...watchPatternsArgs, ...proxiesArgs];
    const shellOptions = { cwd: workingDir };

    debug(`Looking for ${chalk.cyan(SERVE_SCRIPT)} npm script.`);

    if (pkg.scripts && pkg.scripts[SERVE_SCRIPT]) {
      debug(`Invoking ${chalk.cyan(SERVE_SCRIPT)} npm script.`);
      const [ pkgManager, ...pkgArgs ] = await pkgManagerArgs(npmClient, { command: 'run', script: SERVE_SCRIPT, scriptArgs: [...args] });
      program = pkgManager;
      args = pkgArgs;
    } else {
      const v1utilArgs = ['serve', path.relative(workingDir, options.wwwDir)];

      if (options.consolelogs) {
        v1utilArgs.push('-c');
      }

      args = [...v1utilArgs, ...args];
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

      const log = this.log.clone({ prefix: chalk.dim(`[${program === DEFAULT_PROGRAM ? 'v1' : program}]`), wrap: false });
      const ws = log.createWriteStream();

      if (program === DEFAULT_PROGRAM) {
        const stdoutFilter = through2(function(chunk, enc, callback) {
          const str = chunk.toString();

          if (str.includes('server running')) {
            resolve({ program });
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

  private async findOpenPorts(address: string, ports: Ports): Promise<Ports> {
    const { ERROR_NETWORK_ADDRESS_NOT_AVAIL, findClosestOpenPort } = await import('../../utils/network');

    try {
      const [ port, livereloadPort, notificationPort ] = await Promise.all([
        findClosestOpenPort(ports.port, '0.0.0.0'),
        findClosestOpenPort(ports.livereloadPort, '0.0.0.0'),
        findClosestOpenPort(ports.notificationPort, '0.0.0.0'),
      ]);

      if (ports.port !== port) {
        debug(`Port ${chalk.bold(String(ports.port))} taken, using ${chalk.bold(String(port))}.`);
        ports.port = port;
      }

      if (ports.livereloadPort !== livereloadPort) {
        debug(`Port ${chalk.bold(String(ports.livereloadPort))} taken, using ${chalk.bold(String(livereloadPort))}.`);
        ports.livereloadPort = livereloadPort;
      }

      if (ports.notificationPort !== notificationPort) {
        debug(`Port ${chalk.bold(String(ports.notificationPort))} taken, using ${chalk.bold(String(notificationPort))}.`);
        ports.notificationPort = notificationPort;
      }

      return { port, livereloadPort, notificationPort };
    } catch (e) {
      if (e !== ERROR_NETWORK_ADDRESS_NOT_AVAIL) {
        throw e;
      }

      throw new FatalException(`${chalk.green(address)} is not available--cannot bind.`);
    }
  }
}
