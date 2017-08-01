import * as path from 'path';
import { ServerOptions } from './config';

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
