import * as util from 'util';

import chalk from 'chalk';
import * as superagentType from 'superagent';

import {
  APIResponse,
  APIResponseError,
  APIResponseSuccess,
  HttpMethod,
  IClient,
  IConfig,
  IPaginator,
  Response,
  SuperAgentError,
} from '../definitions';

import { isAPIResponseError, isAPIResponseSuccess } from '../guards';
import { getGlobalProxy } from './utils/http';
import { fsReadFile } from '@ionic/cli-framework/utils/fs';
import { FatalException } from './errors';

const FORMAT_ERROR_BODY_MAX_LENGTH = 1000;
export const CONTENT_TYPE_JSON = 'application/json';

export const ERROR_UNKNOWN_CONTENT_TYPE = 'UNKNOWN_CONTENT_TYPE';
export const ERROR_UNKNOWN_RESPONSE_FORMAT = 'UNKNOWN_RESPONSE_FORMAT';

let CAS: string[] | undefined;
let CERTS: string[] | undefined;
let KEYS: string[] | undefined;

export async function createRawRequest(method: string, url: string): Promise<{ req: superagentType.SuperAgentRequest; }> {
  const superagent = await import('superagent');
  const req = superagent(method, url);

  return { req };
}

export async function createRequest(config: IConfig, method: string, url: string): Promise<{ req: superagentType.SuperAgentRequest; }> {
  const c = await config.load();
  const [ proxy, ] = getGlobalProxy();

  const { req } = await createRawRequest(method, url);

  if (proxy && req.proxy) {
    req.proxy(proxy);
  }

  if (c.ssl) {
    const conform = (p?: string | string[]): string[] => {
      if (!p) {
        return [];
      }

      if (typeof p === 'string') {
        return [p];
      }

      return p;
    };

    if (!CAS) {
      CAS = await Promise.all(conform(c.ssl.cafile).map(p => fsReadFile(p, { encoding: 'utf8' })));
    }

    if (!CERTS) {
      CERTS = await Promise.all(conform(c.ssl.certfile).map(p => fsReadFile(p, { encoding: 'utf8' })));
    }

    if (!KEYS) {
      KEYS = await Promise.all(conform(c.ssl.keyfile).map(p => fsReadFile(p, { encoding: 'utf8' })));
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

export class Client implements IClient {
  constructor(public config: IConfig) {}

  async make(method: HttpMethod, path: string): Promise<{ req: superagentType.SuperAgentRequest; }> {
    const url = path.startsWith('http://') || path.startsWith('https://') ? path : `${await this.config.getAPIUrl()}${path}`;
    const { req } = await createRequest(this.config, method, url);

    req
      .set('Content-Type', CONTENT_TYPE_JSON)
      .set('Accept', CONTENT_TYPE_JSON);

    return { req };
  }

  async do(req: superagentType.SuperAgentRequest): Promise<APIResponseSuccess> {
    const res = await req;
    const r = transformAPIResponse(res);

    if (isAPIResponseError(r)) {
      throw new FatalException('API request was successful, but the response output format was that of an error.\n'
                             + formatAPIError(req, r));
    }

    return r;
  }

  async paginate<T extends Response<Object[]>>(reqgen: () => Promise<{ req: superagentType.SuperAgentRequest; }>, guard: (res: APIResponseSuccess) => res is T): Promise<Paginator<T>> {
    return new Paginator<T>(this, reqgen, guard);
  }
}

export class Paginator<T extends Response<Object[]>> implements IPaginator<T> {
  protected previousReq?: superagentType.SuperAgentRequest;
  protected done = false;

  constructor(
    protected client: IClient,
    protected reqgen: () => Promise<{ req: superagentType.SuperAgentRequest; }>,
    protected guard: (res: APIResponseSuccess) => res is T,
  ) {}

  next(): IteratorResult<Promise<T>> {
    if (this.done) {
      return { done: true } as IteratorResult<Promise<T>>; // TODO: why can't I exclude value?
    }

    return {
      done: false,
      value: (async () => {
        const { req } = await this.reqgen();

        if (!this.previousReq) {
          this.previousReq = req;
        }

        const page = this.previousReq.qs.page && !isNaN(Number(this.previousReq.qs.page)) ? this.previousReq.qs.page + 1 : 1;
        const pageSize = this.previousReq.qs.page_size && !isNaN(Number(this.previousReq.qs.page_size)) ? this.previousReq.qs.page_size : 25;

        req.query({ page, 'page_size': pageSize });

        const res = await this.client.do(req);
        if (!this.guard(res)) {
          throw createFatalAPIFormat(req, res);
        }

        if (res.data.length === 0 || res.data.length < pageSize) {
          this.done = true;
        }

        this.previousReq = req;
        return res;
      })(),
    };
  }

  [Symbol.iterator](): this {
    return this;
  }
}

export function transformAPIResponse(r: superagentType.Response): APIResponse {
  if (r.status === 204) {
    r.body = { data: null, meta: { status: 204, version: '', request_id: '' } };
  }

  if (r.status !== 204 && r.type !== CONTENT_TYPE_JSON) {
    throw ERROR_UNKNOWN_CONTENT_TYPE;
  }

  let j = <APIResponse>r.body;

  if (!j.meta) {
    throw ERROR_UNKNOWN_RESPONSE_FORMAT;
  }

  return j;
}

export function createFatalAPIFormat(req: superagentType.SuperAgentRequest, res: APIResponse): FatalException {
  return new FatalException('API request was successful, but the response format was unrecognized.\n'
                          + formatAPIResponse(req, res));
}

export function formatSuperAgentError(e: SuperAgentError): string {
  const res = e.response;
  const req = res.request;
  const statusCode = e.response.status;

  let f = '';

  try {
    const r = transformAPIResponse(res);
    f += formatAPIResponse(req, r);
  } catch (e) {
    f += `HTTP Error ${statusCode}: ${req.method.toUpperCase()} ${req.url}\n`;
    // TODO: do this only if verbose?
    f += '\n' + res.text ? res.text.substring(0, FORMAT_ERROR_BODY_MAX_LENGTH) : '<no buffered body>';

    if (res.text && res.text.length > FORMAT_ERROR_BODY_MAX_LENGTH) {
      f += ` ...\n\n[ truncated ${res.text.length - FORMAT_ERROR_BODY_MAX_LENGTH} characters ]`;
    }
  }

  return chalk.bold(chalk.red(f));
}

export function formatAPIResponse(req: superagentType.SuperAgentRequest, r: APIResponse) {
  if (isAPIResponseSuccess(r)) {
    return formatAPISuccess(req, r);
  } else {
    return formatAPIError(req, r);
  }
}

export function formatAPISuccess(req: superagentType.SuperAgentRequest, r: APIResponseSuccess): string {
  return `Request: ${req.method} ${req.url}\n`
    + `Response: ${r.meta.status}\n`
    + `Body: \n${util.inspect(r.data, { colors: chalk.enabled })}`;
}

export function formatAPIError(req: superagentType.SuperAgentRequest, r: APIResponseError): string {
  return `Request: ${req.method} ${req.url}\n`
    + `Response: ${r.meta.status}\n`
    + `Body: \n${util.inspect(r.error, { colors: chalk.enabled })}`;
}
