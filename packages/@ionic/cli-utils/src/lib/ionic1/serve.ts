import * as path from 'path';

import chalk from 'chalk';
import * as expressType from 'express';
import { fsReadFile, pathExists } from '@ionic/cli-framework/utils/fs';

import { IonicEnvironment, LiveReloadFunction, ServeDetails, ServeOptions } from '../../definitions';

import {
  DEV_SERVER_PREFIX,
  createDevLoggerServer,
  createDevServerHandler,
  injectDevServerScript,
  injectLiveReloadScript,
} from '../dev-server';

import {
  BIND_ALL_ADDRESS,
  DEFAULT_PROXY_CONFIG,
  LOCAL_ADDRESSES,
  attachProjectProxies,
  attachProxy,
  findOpenPorts,
  selectExternalIP,
} from '../serve';

const WATCH_PATTERNS = [
  'scss/**/*',
  'www/**/*',
  '!www/lib/**/*',
  '!www/**/*.map'
];

interface ServeMetaOptions extends ServeOptions {
  wwwDir: string;
  externalIP: string;
}

const IOS_PLATFORM_PATH = path.join('platforms', 'ios', 'www');
const ANDROID_PLATFORM_PATH = path.join('platforms', 'android', 'assets', 'www');

export async function serve({ env, options }: { env: IonicEnvironment; options: ServeOptions; }): Promise<ServeDetails> {
  const [ externalIP, availableInterfaces ] = await selectExternalIP(env, options);
  const wwwDir = await env.project.getSourceDir();

  const { port, livereloadPort, notificationPort } = await findOpenPorts(env, options.address, options);

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

  env.log.info(`Starting server (${details.join(', ')}) - Ctrl+C to cancel`);

  // Start up server
  const settings = await setupServer(env, { externalIP, wwwDir, ...options });

  return {
    protocol: 'http',
    localAddress: 'localhost',
    externalAddress: externalIP,
    externalNetworkInterfaces: availableInterfaces,
    port: settings.port,
    externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(externalIP),
  };
}

async function setupServer(env: IonicEnvironment, options: ServeMetaOptions): Promise<ServeMetaOptions> {
  let reloadfn: LiveReloadFunction | undefined;

  if (options.livereload) {
    const { createLiveReloadServer } = await import('../dev-server');
    reloadfn = await createLiveReloadServer(env, { port: options.livereloadPort, wwwDir: options.wwwDir });
  }

  await createHttpServer(env, options);

  const chokidar = await import('chokidar');
  const project = await env.project.load();

  if (!project.watchPatterns || project.watchPatterns.length === 1 && project.watchPatterns[0] === 'scss/**/*') {
    project.watchPatterns = WATCH_PATTERNS;
  }

  env.log.debug(`Watch patterns: ${project.watchPatterns.map(v => chalk.bold(v)).join(', ')}`);
  const watcher = chokidar.watch(project.watchPatterns, { cwd: env.project.directory });
  env.events.emit('watch:init');

  watcher.on('change', (filePath: string) => {
    env.log.info(`[${new Date().toTimeString().slice(0, 8)}] ${chalk.bold(filePath)} changed`);

    if (reloadfn) {
      reloadfn([filePath]);
    }

    env.events.emit('watch:change', filePath);
  });

  watcher.on('error', (err: Error) => {
    env.log.error(err.toString());
  });

  return options;
}

/**
 * Create HTTP server
 */
async function createHttpServer(env: IonicEnvironment, options: ServeMetaOptions): Promise<expressType.Application> {
  const express = await import('express');

  const app = express();

  /**
   * http responder for /index.html base entrypoint
   */
  const serveIndex = async (req: expressType.Request, res: expressType.Response) => {
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

  /**
   * Middleware to serve platform resources
   */
  const servePlatformResource = async (req: expressType.Request, res: expressType.Response, next: expressType.NextFunction) => {
    const userAgent = req.header('user-agent') || '';
    let resourcePath = options.wwwDir;

    if (!options.iscordovaserve) {
      return next();
    }

    if (isUserAgentIOS(userAgent)) {
      resourcePath = path.join(env.project.directory, IOS_PLATFORM_PATH);
    } else if (isUserAgentAndroid(userAgent)) {
      resourcePath = path.join(env.project.directory, ANDROID_PLATFORM_PATH);
    }

    if (await pathExists(path.join(resourcePath, req.url))) {
      res.sendFile(req.url, { root: resourcePath });
    } else {
      next();
    }
  };

  if (options.basicAuth) {
    const basicAuth = await import('basic-auth');
    const [ name, pass ] = options.basicAuth;

    app.use((req, res, next) => {
      const user = basicAuth(req);

      const unauthorized = (res: expressType.Response) => {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        return res.sendStatus(401);
      };

      if (!user || !user.name || !user.pass || user.name !== name || user.pass !== pass) {
        return unauthorized(res);
      }

      return next();
    });
  }

  app.use((req, res, next) => {
    env.log.debug(`${req.method} ${req.path}`);
    next();
  });

  app.get('/', serveIndex);
  app.use('/', express.static(options.wwwDir));

  app.get('/cordova.js', servePlatformResource, serveMockCordovaJS);
  app.get('/cordova_plugins.js', servePlatformResource);
  app.get('/plugins/*', servePlatformResource);

  const livereloadUrl = `http://localhost:${options.livereloadPort}`;
  const pathPrefix = `/${DEV_SERVER_PREFIX}/tiny-lr`;

  await attachProxy(app, pathPrefix, { ...DEFAULT_PROXY_CONFIG, target: livereloadUrl, pathRewrite: { [pathPrefix]: '' }, logProvider: () => env.log });

  if (options.proxy) {
    await attachProjectProxies(app, env);
  }

  app.get(`/${DEV_SERVER_PREFIX}/dev-server.js`, await createDevServerHandler(options));

  const wss = await createDevLoggerServer(env, options.notificationPort);

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

/**
 * http responder for cordova.js file
 */
function serveMockCordovaJS(req: expressType.Request, res: expressType.Response) {
  res.set('Content-Type', 'application/javascript');
  res.send('// mock cordova file during development');
}

function isUserAgentIOS(ua: string) {
  ua = ua.toLowerCase();
  return (ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1 || ua.indexOf('ipod') > -1);
}

function isUserAgentAndroid(ua: string) {
  ua = ua.toLowerCase();
  return ua.indexOf('android') > -1;
}
