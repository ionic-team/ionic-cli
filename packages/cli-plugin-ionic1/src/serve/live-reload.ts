import * as path from 'path';
import { ServerOptions } from './config';
import { load } from '../lib/modules';

export function createLiveReloadServer(options: ServerOptions): Function {
  const tinylr = load('tiny-lr');
  const liveReloadServer = tinylr();
  liveReloadServer.listen(options.livereloadPort, options.address);

  return function fileChange(changedFiles: string[]) {
    liveReloadServer.changed({
      body: {
        files: changedFiles.map(changedFile => (
          '/' + path.relative(options.wwwDir, changedFile)
        ))
      }
    });
  };
}

export function injectLiveReloadScript(content: any, host: string, port: Number): any {
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

function getLiveReloadScript(host: string, port: Number) {
  if (host === '0.0.0.0') {
    host = 'localhost';
  }
  const src = `//${host}:${port}/livereload.js?snipver=1`;

  return `  <!-- Ionic Dev Server: Injected LiveReload Script -->\n` +
    `  <script src="${src}" async="" defer=""></script>`;
}
