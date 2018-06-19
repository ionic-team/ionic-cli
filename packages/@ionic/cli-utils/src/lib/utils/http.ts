import * as Debug from 'debug';

import * as ζsuperagent from 'superagent';

import { conform } from '@ionic/cli-framework/utils/array';
import { fsReadFile } from '@ionic/cli-framework/utils/fs';

import { CreateRequestOptions, HttpMethod } from '../../definitions';

const debug = Debug('ionic:cli-utils:lib:utils:http');

export const PROXY_ENVIRONMENT_VARIABLES: ReadonlyArray<string> = ['IONIC_HTTP_PROXY', 'HTTPS_PROXY', 'HTTP_PROXY', 'PROXY', 'https_proxy', 'http_proxy', 'proxy'];

function getGlobalProxy(): { envvar: string; envval: string; } | undefined {
  for (const envvar of PROXY_ENVIRONMENT_VARIABLES) {
    const envval = process.env[envvar];

    if (envval) {
      return { envval, envvar };
    }
  }
}

export async function createRequest(method: HttpMethod, url: string, { proxy, ssl }: CreateRequestOptions): Promise<{ req: ζsuperagent.SuperAgentRequest; }> {
  const superagent = await import('superagent');

  if (!proxy) {
    const gproxy = getGlobalProxy();

    if (gproxy) {
      proxy = gproxy.envval;
    }
  }

  const req = superagent(method, url);

  req.redirects(25);

  if (proxy) {
    const superagentProxy = await import('superagent-proxy');
    superagentProxy(superagent);

    if (req.proxy) {
      req.proxy(proxy);
    } else {
      debug(`Cannot install proxy--req.proxy not defined`);
    }
  }

  if (ssl) {
    const cafiles = conform(ssl.cafile);
    const certfiles = conform(ssl.certfile);
    const keyfiles = conform(ssl.keyfile);

    if (cafiles.length > 0) {
      req.ca(await Promise.all(cafiles.map(p => fsReadFile(p, { encoding: 'utf8' }))));
    }

    if (certfiles.length > 0) {
      req.cert(await Promise.all(certfiles.map(p => fsReadFile(p, { encoding: 'utf8' }))));
    }

    if (keyfiles.length > 0) {
      req.key(await Promise.all(keyfiles.map(p => fsReadFile(p, { encoding: 'utf8' }))));
    }
  }

  return { req };
}

/**
 * Initiate a request, downloading the contents to a writable stream.
 *
 * @param req The request to download to the writable stream.
 * @param ws Must be a dedicated writable stream that calls the 'close' event.
 */
export async function download(req: ζsuperagent.SuperAgentRequest, ws: NodeJS.WritableStream, { progress }: { progress?: (loaded: number, total: number) => void; }): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    req
      .on('response', res => {
        if (res.statusCode !== 200) {
          reject(new Error(
            `Encountered bad status code (${res.statusCode}) for ${req.url}\n` +
            `This could mean the server is experiencing difficulties right now--please try again later.`
          ));
        }

        if (progress) {
          let loaded = 0;
          const total = Number(res.headers['content-length']);
          res.on('data', chunk => {
            loaded += chunk.length;
            progress(loaded, total);
          });
        }
      })
      .on('error', err => {
        if (err.code === 'ECONNABORTED') {
          reject(new Error(`Timeout of ${err.timeout}ms reached for ${req.url}`));
        } else {
          reject(err);
        }
      });

    ws.on('close', resolve);

    req.pipe(ws);
  });
}
