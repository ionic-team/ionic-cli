import chalk from 'chalk';
import * as Debug from 'debug';

import { parsedArgsToArgv } from '@ionic/cli-framework';

import { ServeDetails, ServeOptions } from '../../definitions';
import { FatalException } from '../errors';
import { BIND_ALL_ADDRESS, LOCAL_ADDRESSES, ServeRunner as BaseServeRunner } from '../serve';

const APP_SCRIPTS_SERVE_CONNECTIVITY_TIMEOUT = 20000; // ms

const debug = Debug('ionic:cli-utils:lib:ionic-angular:serve');

export class ServeRunner extends BaseServeRunner<ServeOptions> {
  async serveProject(options: ServeOptions): Promise<ServeDetails> {
    const { promptToInstallPkg } = await import('../utils/npm');
    const { findClosestOpenPort, isHostConnectable } = await import('../utils/network');
    const [ externalIP, availableInterfaces ] = await this.selectExternalIP(options);

    const appScriptsPort = await findClosestOpenPort(options.port, '0.0.0.0');

    try {
      await this.servecmd(options);
    } catch (e) {
      if (e.code === 'ENOENT') {
        const pkg = '@ionic/app-scripts';
        this.env.log.nl();
        this.env.log.warn(
          `Looks like ${chalk.green(pkg)} isn't installed in this project.\n` +
          `This package is required for ${chalk.green('ionic serve')} in ${this.env.project.formatType('ionic-core-angular')} projects.`
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

  async servecmd(options: ServeOptions): Promise<void> {
    const [ through2, split2 ] = await Promise.all([import('through2'), import('split2')]);
    const { registerShutdownFunction } = await import('../process');

    const appScriptsArgs = await serveOptionsToAppScriptsArgs(options);

    const p = await this.env.shell.spawn('ionic-app-scripts', ['serve', ...appScriptsArgs], { cwd: this.env.project.directory, env: { FORCE_COLOR: chalk.enabled ? '1' : '0' } });

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
}

export async function serveOptionsToAppScriptsArgs(options: ServeOptions) {
  const args = {
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
    iscordovaserve: options.target === 'cordova',
    platform: options.platform,
    target: options.target,
    env: options.env,
  };

  return parsedArgsToArgv(args, { useEquals: false });
}
