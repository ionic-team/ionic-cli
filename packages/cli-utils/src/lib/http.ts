import * as util from 'util';

import * as chalk from 'chalk';
import * as superagentType from 'superagent';

import {
  APIResponse,
  APIResponseError,
  APIResponseSuccess,
  IClient,
  HttpMethod,
  Response,
  SuperAgentError,
} from '../definitions';

import { isAPIResponseError, isAPIResponseSuccess } from '../guards';
import { load } from './modules';
import { FatalException } from './errors';

const FORMAT_ERROR_BODY_MAX_LENGTH = 1000;
const CONTENT_TYPE_JSON = 'application/json';
export const ERROR_UNKNOWN_CONTENT_TYPE = 'UNKNOWN_CONTENT_TYPE';
export const ERROR_UNKNOWN_RESPONSE_FORMAT = 'UNKNOWN_RESPONSE_FORMAT';

export function getGlobalProxy(): [string, string] | [undefined, undefined] {
  const envvars = ['IONIC_HTTP_PROXY', 'HTTPS_PROXY', 'HTTP_PROXY', 'PROXY', 'https_proxy', 'http_proxy', 'proxy'];

  for (let envvar of envvars) {
    if (process.env[envvar]) {
      return [process.env[envvar], envvar];
    }
  }

  return [undefined, undefined];
}

export function createRequest(method: string, url: string): superagentType.SuperAgentRequest {
  const [ proxy, ] = getGlobalProxy();
  const superagent = load('superagent');
  let req = superagent(method, url);

  if (proxy && req.proxy) {
    req = req.proxy(proxy);
  }

  return req;
}

// TODO: .clone() should be built into superagent =( (https://github.com/visionmedia/superagent/pull/627)
export function cloneRequest(req: superagentType.SuperAgentRequest): superagentType.SuperAgentRequest {
  const req2 = createRequest(req.method, req.url);
  // querystring
  req2.qs = req.qs;
  // headers
  const originalRequest = req.request();
  req2.set(originalRequest._headers);
  // data and other stuff
  req2._data = req._data;
  req2._buffer = req._buffer;
  req2._timeout = req._timeout;
  return req2;
}

export class Client implements IClient {
  constructor(public host: string) {}

  make(method: HttpMethod, path: string): superagentType.Request {
    return createRequest(method, `${this.host}${path}`)
      .timeout(10000) // 10 second timeout
      .set('Content-Type', CONTENT_TYPE_JSON)
      .set('Accept', CONTENT_TYPE_JSON);
  }

  do(req: superagentType.Request): Promise<APIResponseSuccess> {
    return doAPIRequest(req);
  }
}

export class Paginator<T extends Response<Object[]>> implements IterableIterator<Promise<T>> {
  protected previousReq: superagentType.SuperAgentRequest;
  protected done = false;
  protected pageSize: number;

  constructor(
    protected req: superagentType.SuperAgentRequest,
    protected guard: (res: APIResponseSuccess) => res is T,
    { pageSize = 25 }: { pageSize?: number },
  ) {
    this.pageSize = pageSize;
    if (req.method !== 'GET') {
      throw new Error(`Pagination only works with GET requests (not ${req.method}).`);
    }

    this.previousReq = req;
  }

  next(): IteratorResult<Promise<T>> {
    return {
      done: this.done,
      value: (async (): Promise<T> => {
        const req = cloneRequest(this.previousReq);
        req.query({ 'page': this.previousReq.qs.page ? this.previousReq.qs.page + 1 : 1, 'page_size': this.previousReq.qs.page_size || this.pageSize });
        const ps = Number(req.qs.page_size) !== NaN ? Number(req.qs.page_size) : this.pageSize;
        const res = await doAPIRequest(req);

        if (!this.guard(res)) {
          throw createFatalAPIFormat(req, res);
        }

        if (res.data.length === 0 || res.data.length < ps) {
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

export async function doAPIRequest(req: superagentType.SuperAgentRequest): Promise<APIResponseSuccess> {
  const res = await req;
  const r = transformAPIResponse(res);

  if (isAPIResponseError(r)) {
    throw new FatalException('API request was successful, but the response output format was that of an error.\n'
                           + formatAPIError(req, r));
  }

  return r;
}

export function transformAPIResponse(r: superagentType.Response): APIResponse {
  if (r.status === 204 && !r.body) {
    r.body = { data: null, meta: { status: 204, version: '', request_id: '' } };
  }

  if (r.type !== CONTENT_TYPE_JSON) {
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

export function formatError(e: SuperAgentError): string {
  const res = e.response;
  const req = res.request;
  const statusCode = e.response.status;

  let f = '';

  try {
    const r = transformAPIResponse(res);
    f += formatAPIResponse(req, r);
  } catch (e) {
    f += `HTTP Error ${statusCode}: ${req.method} ${req.url}\n`;
    // TODO: do this only if verbose?
    f += '\n' + res.text.substring(0, FORMAT_ERROR_BODY_MAX_LENGTH);

    if (res.text.length > FORMAT_ERROR_BODY_MAX_LENGTH) {
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
    + `Body: \n${util.inspect(r.data)}`;
}

export function formatAPIError(req: superagentType.SuperAgentRequest, r: APIResponseError): string {
  return `Request: ${req.method} ${req.url}\n`
    + `Response: ${r.meta.status}\n`
    + `Body: \n${util.inspect(r.error)}`;
}
