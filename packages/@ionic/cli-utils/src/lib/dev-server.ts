import * as path from 'path';

import { IonicEnvironment, LiveReloadFunction } from '../definitions';

export const DEV_SERVER_PREFIX = '__ionic';

export function injectDevServerScript(content: any): string {
  let contentStr = content.toString();
  const devServerScript = getDevServerScript();

  if (contentStr.indexOf(`/${DEV_SERVER_PREFIX}/dev-server.js`) > -1) {
    // already added script
    return content;
  }

  let match = contentStr.match(/<\/body>(?![\s\S]*<\/body>)/i);
  if (!match) {
    match = contentStr.match(/<\/html>(?![\s\S]*<\/html>)/i);
  }
  if (match) {
    contentStr = contentStr.replace(match[0], `${devServerScript}\n${match[0]}`);
  } else {
    contentStr += devServerScript;
  }

  return contentStr;
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
  const liveReloadScript = getLiveReloadScript(port);

  if (content.indexOf('/livereload.js') > -1) {
    // already added script
    return content;
  }

  let match = content.match(/<\/body>(?![\s\S]*<\/body>)/i);
  if (!match) {
    match = content.match(/<\/html>(?![\s\S]*<\/html>)/i);
  }
  if (match) {
    content = content.replace(match[0], `${liveReloadScript}\n${match[0]}`);
  } else {
    content += liveReloadScript;
  }

  return content;
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
