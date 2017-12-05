import * as fs from 'fs';
import * as path from 'path';

import chalk from 'chalk';
import * as Debug from 'debug';

import { pathAccessible } from '@ionic/cli-framework/utils/fs';

import { IonicEnvironment, ServeDetails, ServeOptions } from '../../definitions';
import { BIND_ALL_ADDRESS, DEFAULT_SERVER_PORT, LOCAL_ADDRESSES, selectExternalIP } from '../serve';

const NG_AUTODETECTED_PROXY_FILE = 'proxy.config.js';
const NG_SERVE_CONNECTIVITY_TIMEOUT = 20000; // ms

const debug = Debug('ionic:cli-utils:lib:ionic-angular:serve');

export async function serve({ env, options }: { env: IonicEnvironment, options: ServeOptions }): Promise<ServeDetails> {
  const { findClosestOpenPort, isHostConnectable } = await import('../utils/network');

  const [ externalIP, availableInterfaces ] = await selectExternalIP(env, options);

  debug('finding closest port to %d', DEFAULT_SERVER_PORT);
  const ngPort = await findClosestOpenPort(DEFAULT_SERVER_PORT, '0.0.0.0');

  await ngServe(env, options.address, ngPort);

  debug('waiting for connectivity with ng serve (%dms timeout)', NG_SERVE_CONNECTIVITY_TIMEOUT);
  await isHostConnectable('localhost', ngPort, NG_SERVE_CONNECTIVITY_TIMEOUT);

  return  {
    protocol: 'http',
    localAddress: 'localhost',
    externalAddress: externalIP,
    externalNetworkInterfaces: availableInterfaces,
    port: ngPort,
    externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(externalIP),
  };
}

async function ngServe(env: IonicEnvironment, host: string, port: number): Promise<void> {
  const [ through2, split2 ] = await Promise.all([import('through2'), import('split2')]);
  const { registerShutdownFunction } = await import('../process');

  const ngArgs: string[] = ['serve', '--host', host, '--port', String(port), '--progress', 'false'];

  if (await pathAccessible(path.resolve(env.project.directory, NG_AUTODETECTED_PROXY_FILE), fs.constants.R_OK)) {
    ngArgs.push('--proxy-config');
    ngArgs.push(NG_AUTODETECTED_PROXY_FILE); // this is fine as long as cwd is the project directory
  }

  const p = await env.shell.spawn('ng', ngArgs, { cwd: env.project.directory });

  registerShutdownFunction(() => p.kill());

  const log = env.log.clone({ prefix: chalk.dim('[ng]'), wrap: false });
  const ws = log.createWriteStream();

  return new Promise<void>(resolve => {
    const stdoutFilter = through2(function(chunk, enc, callback) {
      const str = chunk.toString();

      if (!str.includes('NG Live Development Server is listening')) {
        this.push(chunk);
      }

      callback();
    });

    p.stdout.pipe(split2()).pipe(stdoutFilter).pipe(ws);
    p.stderr.pipe(split2()).pipe(ws);

    resolve(); // TODO: find a way to detect when webpack is finished bundling
  });
}
