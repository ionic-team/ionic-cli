import * as path from 'path';
import * as util from 'util';

import * as expressType from 'express';
import * as wsType from 'ws';
import { fsReadFile } from '@ionic/cli-framework/utils/fs';

import chalk from 'chalk';
import { Chalk } from 'chalk';

export const DEV_SERVER_PREFIX = '__ionic';

export interface DevServerMessage {
  category: 'console';
  type: string;
  data: any[];
}

export interface DevServerOptions {
  consolelogs: boolean;
  devPort: number;
}

export type LiveReloadFunction = (changedFiles: string[]) => void;

export function isDevServerMessage(m: any): m is DevServerMessage {
  return m
    && typeof m.category === 'string'
    && typeof m.type === 'string'
    && m.data && typeof m.data.length === 'number';
}

export function injectScript(content: string, code: string): string {
  let match = content.match(/<\/body>(?![\s\S]*<\/body>)/i);

  if (!match) {
    match = content.match(/<\/html>(?![\s\S]*<\/html>)/i);
  }

  if (match) {
    content = content.replace(match[0], `${code}${match[0]}`);
  } else {
    content += code;
  }

  return content;
}

export async function createDevServerHandler(options: DevServerOptions): Promise<expressType.RequestHandler> {
  const devServerConfig = {
    consolelogs: options.consolelogs,
    wsPort: options.devPort,
  };

  const devServerJs = await fsReadFile(path.join(__dirname, '..', '..', 'assets', 'dev-server.js'), { encoding: 'utf8' });

  return (req, res) => {
    res.set('Content-Type', 'application/javascript');

    res.send(
      `window.Ionic = window.Ionic || {}; window.Ionic.DevServerConfig = ${JSON.stringify(devServerConfig)};\n\n` +
      `${devServerJs}`.trim()
    );
  };
}

export async function attachDevServer(app: expressType.Application, options: DevServerOptions) {
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

export async function createLiveReloadServer({ port, wwwDir }: { port: number; wwwDir: string; }): Promise<LiveReloadFunction> {
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

export async function createDevLoggerServer(port: number): Promise<wsType.Server> {
  const WebSocket = await import('ws');

  const wss = new WebSocket.Server({ port });

  wss.on('connection', ws => {
    ws.on('message', (data) => {
      let msg;

      try {
        data = data.toString();
        msg = JSON.parse(data);
      } catch (e) {
        console.error(`Error parsing JSON message from dev server: "${data}" ${chalk.red(e.stack ? e.stack : e)}`);
        return;
      }

      if (!isDevServerMessage(msg)) {
        const m = util.inspect(msg, { colors: chalk.enabled });
        console.error(`Bad format in dev server message: ${m}`);
        return;
      }

      if (msg.category === 'console') {
        let status: Chalk | undefined; // unknown levels are normal color

        if (msg.type === 'info' || msg.type === 'log') {
          status = chalk.reset;
        } else if (msg.type === 'error') {
          status = chalk.red;
        } else if (msg.type === 'warn') {
          status = chalk.yellow;
        }

        if (status) {
          console.log(`[${status('console.' + msg.type)}]: ${msg.data.join(' ')}`);
        } else {
          console.log(`[console]: ${msg.data.join(' ')}`);
        }
      }
    });
  });

  return wss;
}
