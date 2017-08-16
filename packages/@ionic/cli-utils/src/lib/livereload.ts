import * as path from 'path';

import { IonicEnvironment, LiveReloadFunction } from '../definitions';

import { BIND_ALL_ADDRESS } from './serve';

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
  if (host === BIND_ALL_ADDRESS) {
    host = 'localhost';
  }
  const src = `//${host}:${port}/livereload.js?snipver=1`;

  return `  <!-- Ionic Dev Server: Injected LiveReload Script -->\n` +
    `  <script src="${src}" async="" defer=""></script>`;
}
