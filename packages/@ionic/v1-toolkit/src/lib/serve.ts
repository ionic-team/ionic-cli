import { pathExists, readFile } from '@ionic/utils-fs';
import chalk from 'chalk';
import * as path from 'path';

import { ConfigFileProxy } from './config';
import { DEV_SERVER_PREFIX, LiveReloadFunction, createDevLoggerServer, createDevServerHandler, createLiveReloadServer, injectDevServerScript, injectLiveReloadScript } from './dev-server';
import { runTask } from './gulp';
import { timestamp } from './log';

export type Application = import('express').Application;
export type Request = import('express').Request;
export type Response = import('express').Response;
export type NextFunction = import('express').NextFunction;
export type ProxyMiddlewareConfig = import('http-proxy-middleware').Config;

export const WATCH_PATTERNS = [
  'scss/**/*',
  'www/**/*',
  '!www/lib/**/*',
  '!www/**/*.map',
];

export function proxyConfigToMiddlewareConfig(proxy: ConfigFileProxy): ProxyMiddlewareConfig {
  const config: ProxyMiddlewareConfig = {
    pathRewrite: { [proxy.path]: '' },
    target: proxy.proxyUrl,
  };

  if (proxy.proxyNoAgent) {
    config.agent = false as any; // TODO: type issue
  }

  if (proxy.rejectUnauthorized === false) {
    config.secure = false;
  }

  return config;
}

export interface ProxyConfig extends ProxyMiddlewareConfig {
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
  engine: string;
  platform?: string;
  watchPatterns: string[];
  proxies: ProxyConfig[];
}

const DEFAULT_PROXY_CONFIG: ProxyMiddlewareConfig = {
  changeOrigin: true,
  logLevel: 'warn',
  ws: true,
};

export async function runServer(options: ServeOptions): Promise<ServeOptions> {
  let reloadfn: LiveReloadFunction | undefined;

  if (options.livereload) {
    reloadfn = await createLiveReloadServer({ host: options.host, port: options.livereloadPort, wwwDir: options.wwwDir });
  }

  await createHttpServer(options);

  const chokidar = await import('chokidar');
  const watcher = chokidar.watch(options.watchPatterns);

  watcher.on('change', async (filePath: string) => {
    process.stdout.write(`${timestamp()} ${chalk.bold(filePath)} changed\n`);

    if (path.extname(filePath) === '.scss') {
      await runTask('sass');
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
async function createHttpServer(options: ServeOptions): Promise<Application> {
  const express = await import('express');
  const app = express();

  /**
   * http responder for /index.html base entrypoint
   */
  const serveIndex = async (req: Request, res: Response) => {
    // respond with the index.html file
    const indexFileName = path.join(options.wwwDir, 'index.html');
    let indexHtml = await readFile(indexFileName, { encoding: 'utf8' });

    indexHtml = injectDevServerScript(indexHtml);

    if (options.livereload) {
      indexHtml = injectLiveReloadScript(indexHtml, options.livereloadPort);
    }

    res.set('Content-Type', 'text/html');
    res.send(indexHtml);
  };

  const serveCordovaPlatformResource = async (req: Request, res: Response, next: NextFunction) => {
    if (options.engine !== 'cordova' || !options.platform) {
      return next();
    }

    const resourcePath = path.resolve('platforms', options.platform, 'platform_www');

    if (await pathExists(path.join(resourcePath, req.url))) {
      res.sendFile(req.url, { root: resourcePath });
    } else {
      next();
    }
  };

  app.get('/', serveIndex);
  app.use('/', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  });
  app.use('/', express.static(options.wwwDir));

  // Cordova
  app.get('/cordova.js', serveCordovaPlatformResource, serveMockCordovaJS);
  app.get('/cordova_plugins.js', serveCordovaPlatformResource);
  app.get('/plugins/*', serveCordovaPlatformResource);

  const livereloadUrl = `http://localhost:${options.livereloadPort}`;
  const pathPrefix = `/${DEV_SERVER_PREFIX}/tiny-lr`;

  await attachProxy(app, { ...DEFAULT_PROXY_CONFIG, mount: pathPrefix, target: livereloadUrl, pathRewrite: { [pathPrefix]: '' } });

  for (const proxy of options.proxies) {
    await attachProxy(app, { ...DEFAULT_PROXY_CONFIG, ...proxy });
    process.stdout.write(`${timestamp()} Proxy created ${chalk.bold(proxy.mount)} => ${proxy.target ? chalk.bold(proxy.target) : '<no target>'}\n`);
  }

  app.get(`/${DEV_SERVER_PREFIX}/dev-server.js`, await createDevServerHandler(options));

  const wss = await createDevLoggerServer(options.host, options.devPort);

  return new Promise<Application>((resolve, reject) => {
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

async function attachProxy(app: Application, config: ProxyConfig) {
  const proxyMiddleware = await import('http-proxy-middleware');
  app.use(config.mount, proxyMiddleware(config.mount, config));
}

function serveMockCordovaJS(req: Request, res: Response) {
  res.set('Content-Type', 'application/javascript');
  res.send('// mock cordova file during development');
}
