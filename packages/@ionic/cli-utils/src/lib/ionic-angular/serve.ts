import chalk from 'chalk';
import * as Debug from 'debug';

import { parsedArgsToArgv } from '@ionic/cli-framework/lib';

import { IonicEnvironment, ServeDetails, ServeOptions } from '../../definitions';
import { BIND_ALL_ADDRESS, LOCAL_ADDRESSES, selectExternalIP } from '../serve';

const APP_SCRIPTS_SERVE_CONNECTIVITY_TIMEOUT = 20000; // ms

const debug = Debug('ionic:cli-utils:lib:ionic-angular:serve');

export interface AppScriptsServeOptions extends ServeOptions {
  platform: string;
  target?: string;
  iscordovaserve: boolean;
}

export async function serve({ env, options }: { env: IonicEnvironment, options: AppScriptsServeOptions }): Promise<ServeDetails> {
  const { findClosestOpenPort, isHostConnectable } = await import('../utils/network');
  const [ externalIP, availableInterfaces ] = await selectExternalIP(env, options);

  const appScriptsPort = await findClosestOpenPort(options.port, '0.0.0.0');

  // env.log.info(`Starting app-scripts server: ${chalk.bold(appScriptsArgs.join(' '))} - Ctrl+C to cancel`);
  await appScriptsServe(env, options);

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

export async function serveOptionsToAppScriptsArgs(options: AppScriptsServeOptions) {
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
    iscordovaserve: options.iscordovaserve,
    platform: options.platform,
    target: options.target,
    env: options.env,
  };

  return parsedArgsToArgv(args, { useEquals: false });
}

async function appScriptsServe(env: IonicEnvironment, options: AppScriptsServeOptions): Promise<void> {
  const [ through2, split2 ] = await Promise.all([import('through2'), import('split2')]);
  const { registerShutdownFunction } = await import('../process');

  const appScriptsArgs = await serveOptionsToAppScriptsArgs(options);

  const p = await env.shell.spawn('ionic-app-scripts', ['serve', ...appScriptsArgs], { cwd: env.project.directory, env: { FORCE_COLOR: chalk.enabled ? '1' : '0' } });

  registerShutdownFunction(() => p.kill());

  const log = env.log.clone({ prefix: chalk.dim('[app-scripts]'), wrap: false });
  const ws = log.createWriteStream();

  return new Promise<void>(resolve => {
    const stdoutFilter = through2(function(chunk, enc, callback) {
      const str = chunk.toString();

      if (str.includes('dev server running')) {
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
