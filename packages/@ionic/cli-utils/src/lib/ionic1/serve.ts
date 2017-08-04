import * as fs from 'fs';
import * as path from 'path';

import * as chalk from 'chalk';

import * as expressType from 'express';

import { IProject, IonicEnvironment, ServeDetails } from '../../definitions';
import { FatalException } from '../errors';

export interface ServerOptions {
  projectRoot: string;
  wwwDir: string;
  protocol: string;
  address: string;
  externalAddress: string;
  port: number;
  httpPort: number;
  livereloadPort: number;
  browser: string | undefined;
  browseroption: string | undefined;
  platform: string | undefined;
  consolelogs: boolean;
  serverlogs: boolean;
  nobrowser: boolean;
  nolivereload: boolean;
  noproxy: boolean;
  lab: boolean;
  iscordovaserve: boolean;
}

export const WATCH_PATTERNS = [
  'www/**/*',
  '!www/lib/**/*',
  '!www/**/*.map'
];

export const LOGGER_DIR = '__ion-dev-server';
export const IONIC_LAB_URL = '/ionic-lab';

export const DEFAULT_ADDRESS = '0.0.0.0';
export const DEFAULT_LIVERELOAD_PORT = 35729;
export const DEFAULT_SERVER_PORT = 8100;

export const IOS_PLATFORM_PATH = path.join('platforms', 'ios', 'www');
export const ANDROID_PLATFORM_PATH = path.join('platforms', 'android', 'assets', 'www');

export async function serve(args: { env: IonicEnvironment; options: { _: string[]; [key: string]: any; }; }): Promise<ServeDetails> {
  const { str2num } = await import('../utils/string');
  const { minimistOptionsToArray } = await import('../utils/command');
  const { ERROR_NETWORK_ADDRESS_NOT_AVAIL, findClosestOpenPort, getAvailableIPAddress } = await import('../utils/network');

  const address = <string>args.options['address'] || DEFAULT_ADDRESS;
  const locallyAccessible = ['0.0.0.0', 'localhost', '127.0.0.1'].includes(address);
  let externalIP = address;

  if (address === '0.0.0.0') {
    // Find appropriate IP to use for cordova to reference
    const availableIPs = getAvailableIPAddress();
    if (availableIPs.length === 0) {
      throw new Error(`It appears that you do not have any external network interfaces. ` +
        `In order to use livereload with emulate you will need one.`
      );
    }

    externalIP = availableIPs[0].address;
    if (availableIPs.length > 1) {
      args.env.log.warn(`${chalk.bold('Multiple network interfaces detected!')}\n` +
                        'You will be prompted to select an external-facing IP for the livereload server that your device or emulator has access to.\n' +
                        `You may also use the ${chalk.green('--address')} option to skip this prompt.\n`);
      const promptedIp = await args.env.prompt({
        type: 'list',
        name: 'promptedIp',
        message: 'Please select which IP to use:',
        choices: availableIPs.map(ip => ip.address)
      });
      externalIP = promptedIp;
    }
  }

  const serverArgs = minimistOptionsToArray(args.options);
  args.env.log.info(`Starting server: ${chalk.bold(serverArgs.join(' '))} - Ctrl+C to cancel`);

  const projectConfig = await args.env.project.load();

  // Setup Options and defaults
  const serverOptions: ServerOptions = {
    projectRoot: args.env.project.directory,
    wwwDir: path.join(args.env.project.directory, projectConfig.documentRoot || 'www'),
    address,
    protocol: 'http',
    externalAddress: externalIP,
    port: str2num(<string>args.options['port'], DEFAULT_SERVER_PORT),
    httpPort: str2num(<string>args.options['port'], DEFAULT_SERVER_PORT),
    livereloadPort: str2num(<string>args.options['livereload-port'], DEFAULT_LIVERELOAD_PORT),
    browser: <string>args.options['browser'],
    browseroption: <string>args.options['browseroption'],
    platform: <string>args.options['platform'],
    consolelogs: <boolean>args.options['consolelogs'] || false,
    serverlogs: <boolean>args.options['serverlogs'] || false,
    nobrowser: <boolean>args.options['nobrowser'] || false,
    nolivereload: <boolean>args.options['nolivereload'] || false,
    noproxy: <boolean>args.options['noproxy'] || false,
    lab: <boolean>args.options['lab'] || false,
    iscordovaserve: <boolean>args.options['iscordovaserve'] || false,
  };

  // Clean up args based on environment state
  try {
    const portResults = await Promise.all([
      findClosestOpenPort(serverOptions.address, serverOptions.port),
      findClosestOpenPort(serverOptions.address, serverOptions.livereloadPort),
    ]);

    serverOptions.port = serverOptions.httpPort = portResults[0];
    serverOptions.livereloadPort = portResults[1];
  } catch (e) {
    if (e !== ERROR_NETWORK_ADDRESS_NOT_AVAIL) {
      throw e;
    }

    throw new FatalException(`${chalk.green(serverOptions.address)} is not available--cannot bind.`);
  }

  // Start up server
  const settings = await setupServer(args.env, serverOptions);

  const localAddress = 'http://localhost:' + serverOptions.port;
  const externalAddress = 'http://' + serverOptions.externalAddress + ':' + serverOptions.port;
  const externallyAccessible = localAddress !== externalAddress;

  args.env.log.info(
    `Development server running\n` +
    (locallyAccessible ? `Local: ${chalk.bold(localAddress)}\n` : '') +
    (externallyAccessible ? `External: ${chalk.bold(externalAddress)}\n` : '')
  );

  if (locallyAccessible && !serverOptions.nobrowser) {
    const openOptions: string[] = [localAddress]
      .concat(serverOptions.lab ? [IONIC_LAB_URL] : [])
      .concat(serverOptions.browseroption ? [serverOptions.browseroption] : [])
      .concat(serverOptions.platform ? ['?ionicplatform=', serverOptions.platform] : []);

    const opn = await import('opn');
    opn(openOptions.join(''));
  }

  return {
    publicIp: serverOptions.externalAddress,
    localAddress: 'localhost',
    locallyAccessible,
    externallyAccessible,
    ...settings,
  };
}

async function setupServer(env: IonicEnvironment, options: ServerOptions): Promise<ServerOptions> {
  const liveReloadBrowser = await createLiveReloadServer(options);
  await createHttpServer(env, options);

  const chokidar = await import('chokidar');
  const projectConfig = await env.project.load();

  if (!projectConfig.watchPatterns) {
    projectConfig.watchPatterns = [];
  }

  const watchPatterns = [...new Set([...projectConfig.watchPatterns, ...WATCH_PATTERNS])];
  env.log.debug(() => `Watch patterns: ${watchPatterns.map(v => chalk.bold(v)).join(', ')}`);
  const watcher = chokidar.watch(watchPatterns, { cwd: env.project.directory });
  env.events.emit('watch:init');

  watcher.on('change', (filePath: string) => {
    env.log.info(`[${new Date().toTimeString().slice(0, 8)}] ${chalk.bold(filePath)} changed`);
    liveReloadBrowser([filePath]);
    env.events.emit('watch:change', filePath);
  });

  watcher.on('error', (err: Error) => {
    env.log.error(err.toString());
  });

  return options;
}

export async function createLiveReloadServer(options: ServerOptions): Promise<(changedFile: string[]) => void> {
  const tinylr = await import('tiny-lr');
  const liveReloadServer = tinylr();
  liveReloadServer.listen(options.livereloadPort);

  return (changedFiles) => {
    liveReloadServer.changed({
      body: {
        files: changedFiles.map(changedFile => (
          '/' + path.relative(options.wwwDir, changedFile)
        ))
      }
    });
  };
}

export function injectLiveReloadScript(content: any, host: string, port: number): any {
  let contentStr = content.toString();
  const liveReloadScript = getLiveReloadScript(host, port);

  if (contentStr.indexOf('/livereload.js') > -1) {
    // already added script
    return content;
  }

  let match = contentStr.match(/<\/body>(?![\s\S]*<\/body>)/i);
  if (!match) {
    match = contentStr.match(/<\/html>(?![\s\S]*<\/html>)/i);
  }
  if (match) {
    contentStr = contentStr.replace(match[0], `${liveReloadScript}\n${match[0]}`);
  } else {
    contentStr += liveReloadScript;
  }

  return contentStr;
}

function getLiveReloadScript(host: string, port: number) {
  if (host === '0.0.0.0') {
    host = 'localhost';
  }
  const src = `//${host}:${port}/livereload.js?snipver=1`;

  return `  <!-- Ionic Dev Server: Injected LiveReload Script -->\n` +
    `  <script src="${src}" async="" defer=""></script>`;
}

/**
 * Create HTTP server
 */
export async function createHttpServer(env: IonicEnvironment, options: ServerOptions): Promise<expressType.Application> {
  const express = await import('express');
  const app = express();
  app.set('serveOptions', options);
  app.listen(options.port, options.address);

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

  if (!options.noproxy) {
    await setupProxies(env.project, app);
  }

  return app;
}

async function setupProxies(project: IProject, app: expressType.Application) {
  const url = await import('url');
  const projectConfig = await project.load();

  for (const proxy of projectConfig.proxies || []) {
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
 * http responder for /index.html base entrypoint
 */
function serveIndex(req: expressType.Request, res: expressType.Response)  {
  const options: ServerOptions = req.app.get('serveOptions');

  // respond with the index.html file
  const indexFileName = path.join(options.wwwDir, 'index.html');
  fs.readFile(indexFileName, (err, indexHtml) => {
    if (!options.nolivereload) {
      indexHtml = injectLiveReloadScript(indexHtml, options.externalAddress, options.livereloadPort);
    }

    res.set('Content-Type', 'text/html');
    res.send(indexHtml);
  });
}

/**
 * http responder for cordova.js file
 */
function serveMockCordovaJS(req: expressType.Request, res: expressType.Response) {
  res.set('Content-Type', 'application/javascript');
  res.send('// mock cordova file during development');
}

/**
 * Middleware to serve platform resources
 */
function servePlatformResource(req: expressType.Request, res: expressType.Response, next: expressType.NextFunction) {
  const options: ServerOptions = req.app.get('serveOptions');
  const userAgent = req.header('user-agent') || '';
  let resourcePath = options.wwwDir;

  if (!options.iscordovaserve) {
    return next();
  }

  if (isUserAgentIOS(userAgent)) {
    resourcePath = path.join(options.projectRoot, IOS_PLATFORM_PATH);
  } else if (isUserAgentAndroid(userAgent)) {
    resourcePath = path.join(options.projectRoot, ANDROID_PLATFORM_PATH);
  }

  fs.stat(path.join(resourcePath, req.url), (err, stats) => {
    if (err) {
      return next();
    }
    res.sendFile(req.url, { root: resourcePath });
  });
}

function isUserAgentIOS(ua: string) {
  ua = ua.toLowerCase();
  return (ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1 || ua.indexOf('ipod') > -1);
}

function isUserAgentAndroid(ua: string) {
  ua = ua.toLowerCase();
  return ua.indexOf('android') > -1;
}
