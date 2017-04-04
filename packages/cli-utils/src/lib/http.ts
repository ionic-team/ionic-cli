import * as util from 'util';

import * as chalk from 'chalk';
import * as superagentType from 'superagent';

import {
  APIResponse,
  APIResponseError,
  APIResponseSuccess,
  IClient,
  HttpMethod,
  SuperAgentError
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

export function createRequest(method: string, url: string): superagentType.Request {
  const [ proxy, ] = getGlobalProxy();
  const superagent = load('superagent');
  let req = superagent(method, url);

  if (proxy && req.proxy) {
    req = req.proxy(proxy);
  }

  return req;
}

export class Client implements IClient {
  constructor(public host: string) {}

  static transform(r: superagentType.Response): APIResponse {
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

  make(method: HttpMethod, path: string): superagentType.Request {
    return createRequest(method, `${this.host}${path}`)
      .timeout(10000) // 10 second timeout
      .set('Content-Type', CONTENT_TYPE_JSON)
      .set('Accept', CONTENT_TYPE_JSON);
  }

  async do(req: superagentType.Request): Promise<APIResponseSuccess> {
    const res = await req;
    const r = Client.transform(res);

    if (isAPIResponseError(r)) {
      throw new FatalException('API request was successful, but the response output format was that of an error.\n'
                             + formatAPIError(req, r));
    }

    return r;
  }
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
    const r = Client.transform(res);
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
