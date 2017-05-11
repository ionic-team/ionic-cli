import * as path from 'path';
import { injectLiveReloadScript } from './live-reload';
import * as expressType from 'express';
import * as fs from 'fs';
import * as url from 'url';
import {
  ServerOptions,
  IONIC_LAB_URL,
  IOS_PLATFORM_PATH,
  ANDROID_PLATFORM_PATH
} from './config';
import { IProject } from '@ionic/cli-utils';

import { LabAppView, ApiCordovaProject } from './lab';
import { load } from '../lib/modules';

/**
 * Create HTTP server
 */
export async function createHttpServer(project: IProject, options: ServerOptions): Promise<expressType.Application> {
  const express = load('express');
  const app = express();
  app.set('serveOptions', options);
  app.listen(options.port, options.address);

  app.get('/', serveIndex);
  app.use('/', express.static(options.wwwDir));

  // Lab routes
  app.use(IONIC_LAB_URL + '/static', express.static(path.join(__dirname, '..', '..', 'lab', 'static')));
  app.get(IONIC_LAB_URL, LabAppView);
  app.get(IONIC_LAB_URL + '/api/v1/cordova', ApiCordovaProject);

  app.get('/cordova.js', servePlatformResource, serveMockCordovaJS);
  app.get('/cordova_plugins.js', servePlatformResource);
  app.get('/plugins/*', servePlatformResource);

  if (!options.noproxy) {
    await setupProxies(project, app);
  }

  return app;
}

async function setupProxies(project: IProject, app: expressType.Application) {

  const projectConfig = await project.load();

  for (const proxy of projectConfig.proxies || []) {
    let opts: any = url.parse(proxy.proxyUrl);
    if (proxy.proxyNoAgent) {
      opts.agent = false;
    }

    opts.rejectUnauthorized = !(proxy.rejectUnauthorized === false);

    const proxyMiddleware = load('proxy-middleware');
    app.use(proxy.path, <expressType.RequestHandler>proxyMiddleware(opts));
    console.log('Proxy added:' + proxy.path + ' => ' + url.format(opts));
  }
}

/**
 * http responder for /index.html base entrypoint
 */
function serveIndex(req: expressType.Request, res: expressType.Response) {
  const options: ServerOptions = req.app.get('serveOptions');

  // respond with the index.html file
  const indexFileName = path.join(options.wwwDir, 'index.html');
  fs.readFile(indexFileName, (err, indexHtml) => {
    if (!options.nolivereload) {
      indexHtml = injectLiveReloadScript(indexHtml, options.address, options.livereloadPort);
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
  const userAgent = req.header('user-agent');
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
