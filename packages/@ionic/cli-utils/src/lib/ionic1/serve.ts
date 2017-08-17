import * as path from 'path';

import * as chalk from 'chalk';

import * as expressType from 'express';

import { IonicEnvironment, LiveReloadFunction, ServeDetails, ServeOptions } from '../../definitions';

import { BIND_ALL_ADDRESS, IONIC_LAB_URL, LOCAL_ADDRESSES } from '../serve';
import { FatalException } from '../errors';
import { fsReadFile, pathExists } from '../utils/fs';

const WATCH_PATTERNS = [
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
  const { ERROR_NETWORK_ADDRESS_NOT_AVAIL, findClosestOpenPort, getAvailableIPAddresses } = await import('../utils/network');

  let externalIP = options.address;

  if (options.address === BIND_ALL_ADDRESS) {
    // Find appropriate IP to use for cordova to reference
    const availableIPs = getAvailableIPAddresses();
    if (availableIPs.length === 0) {
      throw new Error(`It appears that you do not have any external network interfaces. ` +
        `In order to use livereload with emulate you will need one.`
      );
    }

    externalIP = availableIPs[0].address;

    if (options.externalAddressRequired && availableIPs.length > 1) {
      env.log.warn(
        'Multiple network interfaces detected!\n' +
        'You will be prompted to select an external-facing IP for the livereload server that your device or emulator has access to.\n' +
        `You may also use the ${chalk.green('--address')} option to skip this prompt.\n`
      );

      const promptedIp = await env.prompt({
        type: 'list',
        name: 'promptedIp',
        message: 'Please select which IP to use:',
        choices: availableIPs.map(ip => ip.address)
      });

      externalIP = promptedIp;
    }
  }

  const project = await env.project.load();
  const wwwDir = path.join(env.project.directory, project.documentRoot || 'www');

  try {
    const [ port, livereloadPort ] = await Promise.all([
      findClosestOpenPort(options.port, '0.0.0.0'),
      findClosestOpenPort(options.livereloadPort, '0.0.0.0'),
    ]);

    if (options.port !== port) {
      env.log.debug(`Port ${chalk.bold(String(options.port))} taken, using ${chalk.bold(String(port))}.`);
      options.port = port;
    }

    if (options.livereloadPort !== livereloadPort) {
      env.log.debug(`Port ${chalk.bold(String(options.livereloadPort))} taken, using ${chalk.bold(String(livereloadPort))}.`);
      options.livereloadPort = livereloadPort;
    }
  } catch (e) {
    if (e !== ERROR_NETWORK_ADDRESS_NOT_AVAIL) {
      throw e;
    }

    throw new FatalException(`${chalk.green(options.address)} is not available--cannot bind.`);
  }

  env.log.info(`Starting server (address: ${chalk.bold(options.address)}, port: ${chalk.bold(String(options.port))}, livereload port: ${chalk.bold(String(options.livereloadPort))}) - Ctrl+C to cancel`);

  // Start up server
  const settings = await setupServer(env, { externalIP, wwwDir, ...options });

  return {
    protocol: 'http',
    localAddress: 'localhost',
    externalAddress: externalIP,
    port: settings.port,
    externallyAccessible: ![BIND_ALL_ADDRESS, ...LOCAL_ADDRESSES].includes(externalIP),
  };
}

async function setupServer(env: IonicEnvironment, options: ServeMetaOptions): Promise<ServeMetaOptions> {
  let reloadfn: LiveReloadFunction | undefined;

  if (options.livereload) {
    const { createLiveReloadServer } = await import('../livereload');
    reloadfn = await createLiveReloadServer(env, { port: options.livereloadPort, wwwDir: options.wwwDir });
  }

  await createHttpServer(env, options);

  const chokidar = await import('chokidar');
  const project = await env.project.load();

  if (!project.watchPatterns) {
    project.watchPatterns = [];
  }

  const watchPatterns = [...new Set([...project.watchPatterns, ...WATCH_PATTERNS])];
  env.log.debug(() => `Watch patterns: ${watchPatterns.map(v => chalk.bold(v)).join(', ')}`);
  const watcher = chokidar.watch(watchPatterns, { cwd: env.project.directory });
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
  app.listen(options.port, options.address);

  /**
   * http responder for /index.html base entrypoint
   */
  const serveIndex = async (req: expressType.Request, res: expressType.Response) => {
    // respond with the index.html file
    const indexFileName = path.join(options.wwwDir, 'index.html');
    let indexHtml = await fsReadFile(indexFileName, { encoding: 'utf8' });

    if (options.livereload) {
      const { injectLiveReloadScript } = await import('../livereload');
      indexHtml = injectLiveReloadScript(indexHtml, options.externalAddressRequired ? options.externalIP : 'localhost', options.livereloadPort);
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

  app.get('/', serveIndex);
  app.use('/', express.static(options.wwwDir));

  // Lab routes
  app.use(IONIC_LAB_URL + '/static', express.static(path.join(__dirname, '..', '..', 'assets', 'ionic1', 'lab', 'static')));
  app.get(IONIC_LAB_URL, (req, res) => res.sendFile('index.html', { root: path.join(__dirname, '..', '..', 'assets', 'ionic1', 'lab') }));
  app.get(IONIC_LAB_URL + '/api/v1/cordova', async (req, res) => {
    const [ info ] = await env.hooks.fire('cordova:project:info', { env });

    if (info) {
      res.json(info);
    } else {
      res.status(400).json({ status: 'error', message: 'Unable to load config.xml' });
    }
  });

  app.get('/cordova.js', servePlatformResource, serveMockCordovaJS);
  app.get('/cordova_plugins.js', servePlatformResource);
  app.get('/plugins/*', servePlatformResource);

  if (options.proxy) {
    await setupProxies(env, app);
  }

  return app;
}

async function setupProxies(env: IonicEnvironment, app: expressType.Application) {
  const url = await import('url');
  const project = await env.project.load();

  for (const proxy of project.proxies || []) {
    let opts: any = url.parse(proxy.proxyUrl);
    if (proxy.proxyNoAgent) {
      opts.agent = false;
    }

    opts.rejectUnauthorized = !(proxy.rejectUnauthorized === false);

    const proxyMiddleware = await import('proxy-middleware');
    app.use(proxy.path, <expressType.RequestHandler>proxyMiddleware(opts));
    console.log('Proxy added:' + proxy.path + ' => ' + url.format(opts));
  }
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
