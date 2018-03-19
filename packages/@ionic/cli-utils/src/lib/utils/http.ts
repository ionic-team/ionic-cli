import chalk from 'chalk';
import * as Debug from 'debug';

import * as superagentType from 'superagent';

import { conform } from '@ionic/cli-framework/utils/array';
import { fsReadFile } from '@ionic/cli-framework/utils/fs';

import { CreateRequestOptions, HttpMethod } from '../../definitions';

const debug = Debug('ionic:cli-utils:lib:utils:http');

let _proxyInstalled = false;

let CAS: string[] | undefined;
let CERTS: string[] | undefined;
let KEYS: string[] | undefined;

export const PROXY_ENVIRONMENT_VARIABLES: ReadonlyArray<string> = ['IONIC_HTTP_PROXY', 'HTTPS_PROXY', 'HTTP_PROXY', 'PROXY', 'https_proxy', 'http_proxy', 'proxy'];

function getGlobalProxy(): [string, string] | [undefined, undefined] {
  for (const envvar of PROXY_ENVIRONMENT_VARIABLES) {
    if (process.env[envvar]) {
      return [process.env[envvar], envvar];
    }
  }

  return [undefined, undefined];
}

export async function installProxy(superagent: superagentType.SuperAgentStatic, proxy: string, proxyVar: string): Promise<boolean> {
  if (_proxyInstalled) {
    return true;
  }

  debug(`Detected ${chalk.green(proxyVar)} in environment`);

  try {
    const superagentProxy = await import('superagent-proxy');
    superagentProxy(superagent);
    _proxyInstalled = true;
    debug(`Proxy installed to ${chalk.green(proxy)}`);
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }

    debug(`Missing proxy package: ${chalk.bold('superagent-proxy')}`);

    return false;
  }

  return true;
}

export async function createRequest(method: HttpMethod, url: string, opts?: CreateRequestOptions): Promise<{ req: superagentType.SuperAgentRequest; }> {
  const superagent = await import('superagent');
  const [ proxy, proxyVar ] = getGlobalProxy();

  const req = superagent(method, url);

  if (proxy && proxyVar) {
    await installProxy(superagent, proxy, proxyVar);

    if (req.proxy) {
      req.proxy(proxy);
    }
  }

  if (opts && opts.ssl) {
    if (!CAS) {
      CAS = await Promise.all(conform(opts.ssl.cafile).map(p => fsReadFile(p, { encoding: 'utf8' })));
    }

    if (!CERTS) {
      CERTS = await Promise.all(conform(opts.ssl.certfile).map(p => fsReadFile(p, { encoding: 'utf8' })));
    }

    if (!KEYS) {
      KEYS = await Promise.all(conform(opts.ssl.keyfile).map(p => fsReadFile(p, { encoding: 'utf8' })));
    }

    if (CAS.length > 0) {
      req.ca(CAS);
    }

    if (CERTS.length > 0) {
      req.cert(CERTS);
    }

    if (KEYS.length > 0) {
      req.key(KEYS);
    }
  }

  return { req };
}

export async function download(url: string, ws: NodeJS.WritableStream, opts?: { progress?: (loaded: number, total: number) => void; } & CreateRequestOptions) {
  const { req } = await createRequest('GET', url, opts);

  const progressFn = opts ? opts.progress : undefined;

  return new Promise<void>((resolve, reject) => {
    req
      .on('response', res => {
        if (res.statusCode !== 200) {
          reject(new Error(
            `Encountered bad status code (${res.statusCode}) for ${url}\n` +
            `This could mean the server is experiencing difficulties right now--please try again later.`
          ));
        }

        if (progressFn) {
          let loaded = 0;
          const total = Number(res.headers['content-length']);
          res.on('data', chunk => {
            loaded += chunk.length;
            progressFn(loaded, total);
          });
        }
      })
      .on('error', err => {
        if (err.code === 'ECONNABORTED') {
          reject(new Error(`Timeout of ${err.timeout}ms reached for ${url}`));
        } else {
          reject(err);
        }
      })
      .on('end', resolve);

    req.pipe(ws);
  });
}
