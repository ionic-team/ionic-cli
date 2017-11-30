import * as path from 'path';
import * as util from 'util';

import * as expressType from 'express';
import * as wsType from 'ws';
import { fsReadFile } from '@ionic/cli-framework/utils/fs';

import chalk from 'chalk';

import { IonicEnvironment, LiveReloadFunction, LogLevel, ServeOptions } from '../definitions';
import { isDevServerMessage } from '../guards';
import { injectScript } from './html';

export const DEV_SERVER_PREFIX = '__ionic';

export async function createDevServerHandler(options: ServeOptions): Promise<expressType.RequestHandler> {
  const devServerConfig = {
    consolelogs: options.consolelogs,
    wsPort: options.notificationPort,
  };

  const devServerJs = await fsReadFile(path.join(__dirname, '..', 'assets', 'dev-server', 'dev-server.js'), { encoding: 'utf8' });

  return (req, res) => {
    res.set('Content-Type', 'application/javascript');

    res.send(
      `window.Ionic = window.Ionic || {}; window.Ionic.DevServerConfig = ${JSON.stringify(devServerConfig)};\n\n` +
      `${devServerJs}`.trim()
    );
  };
}

export async function attachDevServer(app: expressType.Application, options: ServeOptions) {
  app.get(`/${DEV_SERVER_PREFIX}/dev-server.js`, await createDevServerHandler(options));
}

export function injectDevServerScript(content: string): string {
  if (content.indexOf(`/${DEV_SERVER_PREFIX}/dev-server.js`) > -1) {
    // already added script
    return content;
  }

  const devServerScript = getDevServerScript();

  return injectScript(content, devServerScript);
}

function getDevServerScript() {
  return `
    <!-- Ionic Dev Server: Injected Dev Server Script -->
    <script src="${DEV_SERVER_PREFIX}/dev-server.js" async="" defer=""></script>
`;
}

export async function createLiveReloadServer(env: IonicEnvironment, { port, wwwDir }: { port: number; wwwDir: string; }): Promise<LiveReloadFunction> {
  const tinylr = await import('tiny-lr');
  const lrserver = tinylr();
  lrserver.listen(port);

  return (changedFiles) => {
    lrserver.changed({
      body: {
        files: changedFiles.map(changedFile => (
          '/' + path.relative(wwwDir, changedFile)
        ))
      }
    });
  };
}

export function injectLiveReloadScript(content: string, port: number): string {
  if (content.indexOf('/livereload.js') > -1) {
    // already added script
    return content;
  }

  const liveReloadScript = getLiveReloadScript(port);

  return injectScript(content, liveReloadScript);
}

function getLiveReloadScript(port: number) {
  const src = `${DEV_SERVER_PREFIX}/tiny-lr/livereload.js`;

  return `
    <!-- Ionic Dev Server: Injected LiveReload Script -->
    <script>
      window.LiveReloadOptions = {
        host: window.location.hostname,
        port: ${port},
        snipver: true,
      };
    </script>
    <script src="${src}" async="" defer=""></script>
`;
}

export async function createDevLoggerServer(env: IonicEnvironment, port: number): Promise<wsType.Server> {
  const WebSocket = await import('ws');
  const { LOGGER_STATUS_COLORS } = await import('./utils/logger');

  const wss = new WebSocket.Server({ port });

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

  return wss;
}
