import * as path from 'path';
import * as util from 'util';

import chalk from 'chalk';

import * as expressType from 'express';
import * as proxyMiddlewareType from 'http-proxy-middleware';
import { fsReadFile, pathExists } from '@ionic/cli-framework/utils/fs';

import { IonicEnvironment, LiveReloadFunction, LogLevel, ServeDetails, ServeOptions } from '../../definitions';
import { isDevServerMessage } from '../../guards';
import { BIND_ALL_ADDRESS, IONIC_LAB_URL, LOCAL_ADDRESSES, findOpenPorts, selectExternalIP } from '../serve';

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
  const { DEV_SERVER_PREFIX, injectDevServerScript, injectLiveReloadScript } = await import('../dev-server');
  const { LOGGER_STATUS_COLORS } = await import('../../lib/utils/logger');

  const [
    WebSocket,
    express,
    proxyMiddleware,
  ] = await Promise.all([
    import('ws'),
    import('express'),
    import('http-proxy-middleware'),
  ]);

  const app = express();
  const project = await env.project.load();

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

  const livereloadUrl = `http://localhost:${options.livereloadPort}`;
  const pathPrefix = `/${DEV_SERVER_PREFIX}/tiny-lr`;
  const proxyMiddlewareCfg: proxyMiddlewareType.Config = { changeOrigin: true, ws: true, logLevel: 'warn', logProvider: () => env.log };

  app.use(pathPrefix, proxyMiddleware(pathPrefix, { target: livereloadUrl, pathRewrite: { [pathPrefix]: '' }, ...proxyMiddlewareCfg }));

  if (options.proxy && project.proxies) {
    for (const proxy of project.proxies) {
      const opts = { target: proxy.proxyUrl, pathRewrite: { [proxy.path]: '' }, ...proxyMiddlewareCfg };

      if (proxy.proxyNoAgent) {
        opts.agent = <any>false; // TODO: type issue
      }

      if (proxy.rejectUnauthorized === false) {
        opts.secure = false;
      }

      app.use(proxy.path, proxyMiddleware(proxy.path, opts));
      env.log.info(`Proxy created ${chalk.bold(proxy.path)} => ${chalk.bold(opts.target)}`);
    }
  }

  app.get(`/${DEV_SERVER_PREFIX}/dev-server.js`, async (req, res) => {
    res.set('Content-Type', 'application/javascript');

    const devServerConfig = {
      consolelogs: options.consolelogs,
      wsPort: options.notificationPort,
    };

    const devServerJs = await fsReadFile(path.join(__dirname, '..', '..', 'assets', 'dev-server', 'dev-server.js'), { encoding: 'utf8' });

    res.send(
      `window.Ionic = window.Ionic || {}; window.Ionic.DevServerConfig = ${JSON.stringify(devServerConfig)};\n\n` +
      `${devServerJs}`.trim()
    );
  });

  const wss = new WebSocket.Server({ port: options.notificationPort });

  wss.on('connection', ws => {
    ws.on('message', (data) => {
      let msg;

      try {
        data = data.toString();
        msg = JSON.parse(data);
      } catch (e) {
        env.log.error(`Error parsing JSON message from dev server: "${data}" ${chalk.red(e.stack ? e.stack : e)}`);
        return;
      }

      if (!isDevServerMessage(msg)) {
        const m = util.inspect(msg, { colors: chalk.enabled });
        env.log.error(`Bad format in dev server message: ${m}`);
        return;
      }

      if (msg.category === 'console') {
        const status = LOGGER_STATUS_COLORS.get(<LogLevel>msg.type);

        if (status) {
          env.log.msg(`[${status('console.' + msg.type)}]: ${msg.data.join(' ')}`);
        } else if (msg.type === 'log') {
          env.log.msg(`[${chalk.gray('console.log')}]: ${msg.data.join(' ')}`);
        } else {
          env.log.msg(`[console]: ${msg.data.join(' ')}`);
        }
      }
    });
  });

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
