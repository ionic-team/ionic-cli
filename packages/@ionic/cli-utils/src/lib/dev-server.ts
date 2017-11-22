import * as path from 'path';

import { IonicEnvironment, LiveReloadFunction } from '../definitions';
import { injectScript } from './html';

export const DEV_SERVER_PREFIX = '__ionic';

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
