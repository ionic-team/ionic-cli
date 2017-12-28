import * as fs from 'fs';
import * as path from 'path';

import chalk from 'chalk';
import * as Debug from 'debug';

import { pathAccessible } from '@ionic/cli-framework/utils/fs';

import { ServeDetails, ServeOptions } from '../../definitions';
import { FatalException } from '../errors';
import { BIND_ALL_ADDRESS, LOCAL_ADDRESSES, ServeRunner as BaseServeRunner } from '../serve';

const NG_AUTODETECTED_PROXY_FILE = 'proxy.config.js';
const NG_SERVE_CONNECTIVITY_TIMEOUT = 20000; // ms

const debug = Debug('ionic:cli-utils:lib:ionic-core-angular:serve');

export class ServeRunner extends BaseServeRunner<ServeOptions> {
  async serveProject(options: ServeOptions): Promise<ServeDetails> {
    const { promptToInstallPkg } = await import('../utils/npm');
    const { findClosestOpenPort, isHostConnectable } = await import('../utils/network');
    const [ externalIP, availableInterfaces ] = await this.selectExternalIP(options);

    debug('finding closest port to %d', options.port);
    const ngPort = await findClosestOpenPort(options.port, '0.0.0.0');

    try {
      await this.servecmd(options.address, ngPort);
    } catch (e) {
      if (e.code === 'ENOENT') {
        const pkg = '@angular/cli';
        this.env.log.nl();
        this.env.log.warn(
          `Looks like ${chalk.green(pkg)} isn't installed in this project.\n` +
          `This package is required for ${chalk.green('ionic serve')} as of CLI 4.0. For more details, please see the CHANGELOG: ${chalk.bold('https://github.com/ionic-team/ionic-cli/blob/master/CHANGELOG.md#4.0.0')}`
        );

        const installed = await promptToInstallPkg(this.env, { pkg, saveDev: true });

        if (!installed) {
          throw new FatalException(`${chalk.green(pkg)} is required for ${chalk.green('ionic serve')} to work properly.`);
        }

        await this.servecmd(options.address, ngPort);
      }
    }

    debug('waiting for connectivity with ng serve (%dms timeout)', NG_SERVE_CONNECTIVITY_TIMEOUT);
    await isHostConnectable('localhost', ngPort, NG_SERVE_CONNECTIVITY_TIMEOUT);

    return {
      protocol: 'http',
      localAddress: 'localhost',
      externalAddress: externalIP,
      externalNetworkInterfaces: availableInterfaces,
      port: ngPort,
      externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(externalIP),
    };
  }

  async servecmd(host: string, port: number): Promise<void> {
    const [ through2, split2 ] = await Promise.all([import('through2'), import('split2')]);
    const { registerShutdownFunction } = await import('../process');

    const ngArgs: string[] = ['serve', '--host', host, '--port', String(port), '--progress', 'false'];
    const shellOptions = { showExecution: true, cwd: this.env.project.directory, env: { FORCE_COLOR: chalk.enabled ? '1' : '0' } };

    if (await pathAccessible(path.resolve(this.env.project.directory, NG_AUTODETECTED_PROXY_FILE), fs.constants.R_OK)) {
      ngArgs.push('--proxy-config');
      ngArgs.push(NG_AUTODETECTED_PROXY_FILE); // this is fine as long as cwd is the project directory
    }

    const p = await this.env.shell.spawn('ng', ngArgs, shellOptions);

    return new Promise<void>((resolve, reject) => {
      p.on('error', err => {
        reject(err);
      });

      registerShutdownFunction(() => p.kill());

      const log = this.env.log.clone({ prefix: chalk.dim('[ng]'), wrap: false });
      const ws = log.createWriteStream();

      const stdoutFilter = through2(function(chunk, enc, callback) {
        const str = chunk.toString();

        if (str.includes('Development Server is listening')) {
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
