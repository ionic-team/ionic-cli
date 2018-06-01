import * as path from 'path';

import chalk from 'chalk';
import { fsReadFile } from '@ionic/cli-framework/utils/fs';

import * as ζexpress from 'express';
import * as ζproxyMiddleware from 'http-proxy-middleware';

import { ConfigFileProxy } from './config';
import { LiveReloadFunction, createLiveReloadServer } from './dev-server';
import { runTask } from './gulp';
import { timestamp } from './log';

import {
  DEV_SERVER_PREFIX,
  createDevLoggerServer,
  createDevServerHandler,
  injectDevServerScript,
  injectLiveReloadScript,
} from './dev-server';

export const WATCH_PATTERNS = [
  'scss/**/*',
  'www/**/*',
  '!www/lib/**/*',
  '!www/**/*.map',
];

export function proxyConfigToMiddlewareConfig(proxy: ConfigFileProxy): ζproxyMiddleware.Config {
  const config: ζproxyMiddleware.Config = {
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

export interface ProxyConfig extends ζproxyMiddleware.Config {
  mount: string;
}

export interface ServeOptions {
  host: string;
  port: number;
  livereload: boolean;
  consolelogs: boolean;
  devPort: number;
  livereloadPort: number;
  wwwDir: string;
  watchPatterns: string[];
  proxies: ProxyConfig[];
}

const DEFAULT_PROXY_CONFIG: ζproxyMiddleware.Config = {
  changeOrigin: true,
  logLevel: 'warn',
  ws: true,
};

export async function runServer(options: ServeOptions): Promise<ServeOptions> {
  let reloadfn: LiveReloadFunction | undefined;

  if (options.livereload) {
    reloadfn = await createLiveReloadServer({ port: options.livereloadPort, wwwDir: options.wwwDir });
  }

  await createHttpServer(options);

  const chokidar = await import('chokidar');
  const watcher = chokidar.watch(options.watchPatterns);

  watcher.on('change', (filePath: string) => {
    process.stdout.write(`${timestamp()} ${chalk.bold(filePath)} changed\n`);

    if (path.extname(filePath) === '.scss') {
      runTask('sass');
    } else {
      if (reloadfn) {
        reloadfn([filePath]);
      }
    }
  });

  watcher.on('error', (err: Error) => {
    process.stderr.write(`${timestamp()} Error in file watcher: ${err.stack ? err.stack : err}\n`);
  });

  return options;
}

/**
 * Create HTTP server
 */
async function createHttpServer(options: ServeOptions): Promise<ζexpress.Application> {
  const express = await import('express');
  const app = express();

  /**
   * http responder for /index.html base entrypoint
   */
  const serveIndex = async (req: ζexpress.Request, res: ζexpress.Response) => {
    // respond with the index.html file
    const indexFileName = path.join(options.wwwDir, 'index.html');
    let indexHtml = await fsReadFile(indexFileName, { encoding: 'utf8' });

    indexHtml = injectDevServerScript(indexHtml);

    if (options.livereload) {
      indexHtml = injectLiveReloadScript(indexHtml, options.livereloadPort);
    }

    res.set('Content-Type', 'text/html');
    res.send(indexHtml);
  };

  app.get('/', serveIndex);
  app.use('/', express.static(options.wwwDir));

  const livereloadUrl = `http://localhost:${options.livereloadPort}`;
  const pathPrefix = `/${DEV_SERVER_PREFIX}/tiny-lr`;

  await attachProxy(app, { ...DEFAULT_PROXY_CONFIG, mount: pathPrefix, target: livereloadUrl, pathRewrite: { [pathPrefix]: '' } });

  for (const proxy of options.proxies) {
    await attachProxy(app, { ...DEFAULT_PROXY_CONFIG, ...proxy });
    process.stdout.write(`${timestamp()} Proxy created ${chalk.bold(proxy.mount)} => ${proxy.target ? chalk.bold(proxy.target) : '<no target>'}\n`);
  }

  app.get(`/${DEV_SERVER_PREFIX}/dev-server.js`, await createDevServerHandler(options));

  const wss = await createDevLoggerServer(options.devPort);

  return new Promise<ζexpress.Application>((resolve, reject) => {
    const httpserv = app.listen(options.port, options.host);

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

async function attachProxy(app: ζexpress.Application, config: ProxyConfig) {
  const proxyMiddleware = await import('http-proxy-middleware');
  app.use(config.mount, proxyMiddleware(config.mount, config));
}
