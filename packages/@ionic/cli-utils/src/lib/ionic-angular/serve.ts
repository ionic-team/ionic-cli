import chalk from 'chalk';
import * as Debug from 'debug';

import * as expressType from 'express';
import * as proxyMiddlewareType from 'http-proxy-middleware';

import { IonicEnvironment, ServeDetails, ServeOptions } from '../../definitions';
import { attachDevServer, injectDevServerScript } from '../dev-server';
import { createRawRequest } from '../http';
import { BIND_ALL_ADDRESS, LOCAL_ADDRESSES, attachLab, attachProjectProxies, findOpenPorts, selectExternalIP } from '../serve';
import { FatalException } from '../errors';

const debug = Debug('ionic:cli-utils:lib:ionic-angular:serve');

const DEFAULT_NG_SERVER_PORT = 28787;

export interface AppScriptsServeOptions extends ServeOptions {
  platform: string;
  target?: string;
  iscordovaserve: boolean;
}

export async function serve({ env, options }: { env: IonicEnvironment, options: AppScriptsServeOptions }): Promise<ServeDetails> {
  const proxyMiddleware = await import('http-proxy-middleware');
  const { findClosestOpenPort, isHostConnectable } = await import('../utils/network');

  const [ externalIP, availableInterfaces ] = await selectExternalIP(env, options);
  const { port, notificationPort } = await findOpenPorts(env, options.address, options);

  options.port = port;
  options.notificationPort = notificationPort;

  debug('finding closest port to %d', DEFAULT_NG_SERVER_PORT);

  const ngPort = await findClosestOpenPort(DEFAULT_NG_SERVER_PORT, '0.0.0.0');
  const ngServeAddress = `http://localhost:${ngPort}`;

  ngServe(env, ngPort);

  const [ connectable, app ] = await Promise.all([
    isHostConnectable('localhost', ngPort, 20000),
    createHttpServer(env, options),
  ]);

  const proxyMiddlewareCfg: proxyMiddlewareType.Config = {
    changeOrigin: true,
    ws: true,
    logLevel: 'warn',
    logProvider: () => env.log,
  };

  if (options.proxy) {
    await attachProjectProxies(app, env);
  }

  app.get('/', async (request, response) => {
    const { req } = await createRawRequest('get', ngServeAddress);
    const res = await req;
    debug('injecting dev server script');
    const text = injectDevServerScript(res.text);
    response.send(text);
  });

  await attachDevServer(app, options);
  await attachLab(app);

  app.use('/*', proxyMiddleware('/', { target: ngServeAddress, ...proxyMiddlewareCfg }));

  if (!connectable) {
    throw new FatalException(`Could not connect to ng server at ${ngServeAddress}.`);
  }

  return  {
    protocol: 'http',
    localAddress: 'localhost',
    externalAddress: externalIP,
    externalNetworkInterfaces: availableInterfaces,
    port,
    externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(externalIP),
  };
}

async function ngServe(env: IonicEnvironment, port: number) {
  const [ through2, split2 ] = await Promise.all([import('through2'), import('split2')]);
  const { registerShutdownFunction } = await import('../process');

  const p = await env.shell.spawn('ng', ['serve', '--host', 'localhost', '--port', String(port), '--progress', 'false'], { cwd: env.project.directory });

  const log = env.log.clone({ prefix: chalk.dim('[ng]'), wrap: false });
  const ws = log.createWriteStream();

  const stdoutFilter = through2(function(chunk, enc, callback) {
    const str = chunk.toString();

    if (!str.includes('NG Live Development Server is listening')) {
      this.push(chunk);
    }

    callback();
  });

  p.stdout.pipe(split2()).pipe(stdoutFilter).pipe(ws);
  p.stderr.pipe(split2()).pipe(ws);

  registerShutdownFunction(() => p.kill());
}

async function createHttpServer(env: IonicEnvironment, options: ServeOptions): Promise<expressType.Application> {
  const express = await import('express');

  const { createDevLoggerServer } = await import('../dev-server');

  const wss = await createDevLoggerServer(env, options.notificationPort);

  const app = express();

  return new Promise<expressType.Application>((resolve, reject) => {
    const httpserv = app.listen(options.port, options.address);

    wss.on('error', err => {
      reject(err);
    });

    httpserv.on('error', err => {
      reject(err);
    });

    httpserv.on('listening', () => {
      resolve(app);
    });
  });
}
