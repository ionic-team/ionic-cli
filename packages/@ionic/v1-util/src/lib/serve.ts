import * as path from 'path';

import chalk from 'chalk';
import * as chokidar from 'chokidar';
import * as express from 'express';
import * as proxyMiddleware from 'http-proxy-middleware';
import { fsReadFile } from '@ionic/cli-framework/utils/fs';

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

export interface ProxyConfig extends proxyMiddleware.Config {
  mount: string;
}

export interface ServeOptions {
  host: string;
  port: number;
  lr: boolean;
  consolelogs: boolean;
  devPort: number;
  lrPort: number;
  wwwDir: string;
  watchPatterns: string[];
  proxies: ProxyConfig[];
}

const DEFAULT_PROXY_CONFIG: proxyMiddleware.Config = {
  changeOrigin: true,
  logLevel: 'warn',
  ws: true,
};

export async function runServer(options: ServeOptions): Promise<ServeOptions> {
  let reloadfn: LiveReloadFunction | undefined;

  if (options.lr) {
    reloadfn = await createLiveReloadServer({ port: options.lrPort, wwwDir: options.wwwDir });
  }

  await createHttpServer(options);

  const watcher = chokidar.watch(options.watchPatterns);

  watcher.on('change', (filePath: string) => {
    process.stdout.write(timestamp(), `${chalk.bold(filePath)} changed\n`);

    if (reloadfn) {
      reloadfn([filePath]);
    }

    if (path.extname(filePath) === '.scss') {
      runTask('sass');
    }
  });

  watcher.on('error', (err: Error) => {
    process.stderr.write(`${err.toString()}\n`);
  });

  return options;
}

/**
 * Create HTTP server
 */
async function createHttpServer(options: ServeOptions): Promise<express.Application> {
  const app = express();

  /**
   * http responder for /index.html base entrypoint
   */
  const serveIndex = async (req: express.Request, res: express.Response) => {
    // respond with the index.html file
    const indexFileName = path.join(options.wwwDir, 'index.html');
    let indexHtml = await fsReadFile(indexFileName, { encoding: 'utf8' });

    indexHtml = injectDevServerScript(indexHtml);

    if (options.lr) {
      indexHtml = injectLiveReloadScript(indexHtml, options.lrPort);
    }

    res.set('Content-Type', 'text/html');
    res.send(indexHtml);
  };

  app.get('/', serveIndex);
  app.use('/', express.static(options.wwwDir));

  const livereloadUrl = `http://localhost:${options.lrPort}`;
  const pathPrefix = `/${DEV_SERVER_PREFIX}/tiny-lr`;

  attachProxy(app, { ...DEFAULT_PROXY_CONFIG, mount: pathPrefix, target: livereloadUrl, pathRewrite: { [pathPrefix]: '' } });

  for (const proxy of options.proxies) {
    attachProxy(app, { ...DEFAULT_PROXY_CONFIG, ...proxy });
    process.stdout.write(`Proxy created ${chalk.bold(proxy.mount)} => ${proxy.target ? chalk.bold(proxy.target) : '<no target>'}\n`);
  }

  app.get(`/${DEV_SERVER_PREFIX}/dev-server.js`, await createDevServerHandler(options));

  const wss = await createDevLoggerServer(options.devPort);

  return new Promise<express.Application>((resolve, reject) => {
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

function attachProxy(app: express.Application, config: ProxyConfig) {
  app.use(config.mount, proxyMiddleware(config.mount, config));
}
