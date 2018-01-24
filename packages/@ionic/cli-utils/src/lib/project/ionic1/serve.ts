import * as path from 'path';

import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';
import * as through2 from 'through2';
import * as split2 from 'split2';
import * as proxyMiddlewareType from 'http-proxy-middleware'; // tslint:disable-line:no-implicit-dependencies

import { str2num } from '@ionic/cli-framework/utils/string';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, Ionic1ServeOptions, ProjectFileProxy, ServeDetails } from '../../../definitions';
import { OptionGroup } from '../../../constants';
import { FatalException } from '../../errors';
import { BIND_ALL_ADDRESS, DEFAULT_DEV_LOGGER_PORT, DEFAULT_LIVERELOAD_PORT, LOCAL_ADDRESSES, ServeRunner as BaseServeRunner } from '../../serve';

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
    const { promptToInstallPkg } = await import('../../utils/npm');

    const [ externalIP, availableInterfaces ] = await this.selectExternalIP(options);
    const project = await this.env.project.load();
    const wwwDir = await this.env.project.getSourceDir();

    const { port, livereloadPort, notificationPort } = await this.findOpenPorts(options.address, options);

    options.port = port;
    options.livereloadPort = livereloadPort;
    options.notificationPort = notificationPort;

    if (!project.watchPatterns || project.watchPatterns.length === 1 && project.watchPatterns[0] === 'scss/**/*') {
      project.watchPatterns = WATCH_PATTERNS;
    }

    debug(`Watch patterns: ${project.watchPatterns.map(v => chalk.bold(v)).join(', ')}`);

    const proxies = project.proxies && options.proxy ? project.proxies.map(p => ({ mount: p.path, ...proxyConfigToMiddlewareConfig(p) })) : [];

    const details = [
      `address: ${chalk.bold(options.address)}`,
      `port: ${chalk.bold(String(port))}`,
      `dev server port: ${chalk.bold(String(notificationPort))}`,
    ];

    if (options.livereload) {
      details.push(`livereload port: ${chalk.bold(String(livereloadPort))}`);
    }

    const cmdopts = lodash.assign({ wwwDir, watchPatterns: project.watchPatterns, proxies }, options);

    try {
      await this.servecmd(cmdopts);
    } catch (e) {
      if (e.code === 'ENOENT') {
        const pkg = '@ionic/v1-util';
        this.env.log.nl();
        this.env.log.warn(
          `Looks like ${chalk.green(pkg)} isn't installed in this project.\n` +
          `This package is required for ${chalk.green('ionic serve')} as of CLI 4.0. For more details, please see the CHANGELOG: ${chalk.bold('https://github.com/ionic-team/ionic-cli/blob/master/CHANGELOG.md#4.0.0')}`
        );

        const installed = await promptToInstallPkg(this.env, { pkg, saveDev: true });

        if (!installed) {
          throw new FatalException(`${chalk.green(pkg)} is required for ${chalk.green('ionic serve')} to work properly.`);
        }

        await this.servecmd(cmdopts);
      }
    }

    return {
      protocol: 'http',
      localAddress: 'localhost',
      externalAddress: externalIP,
      externalNetworkInterfaces: availableInterfaces,
      port,
      externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(externalIP),
    };
  }

  private async servecmd(options: ServeMetaOptions): Promise<void> {
    const { registerShutdownFunction } = await import('../../process');

    const workingDir = this.env.project.directory;

    const args = ['serve', path.relative(workingDir, options.wwwDir)];

    if (options.consolelogs) {
      args.push('-c');
    }

    const networkArgs = ['--host', options.address, '--port', String(options.port), '--lr-port', String(options.livereloadPort), '--dev-port', String(options.notificationPort)];
    const watchPatternsArgs = lodash.flatten(options.watchPatterns.map(p => ['-w', p]));
    const proxiesArgs = lodash.flatten(options.proxies.map(p => ['-p', JSON.stringify(p)]));

    const p = await this.env.shell.spawn('ionic-v1', [...args, ...networkArgs, ...watchPatternsArgs, ...proxiesArgs], { cwd: workingDir, env: { FORCE_COLOR: chalk.enabled ? '1' : '0', ...process.env } });

    return new Promise<void>((resolve, reject) => {
      p.on('error', err => {
        reject(err);
      });

      registerShutdownFunction(() => p.kill());

      const log = this.env.log.clone({ prefix: chalk.dim('[v1]'), wrap: false });
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
