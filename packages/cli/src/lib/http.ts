import * as util from 'util';

import * as chalk from 'chalk';
import * as superagent from 'superagent';

import {
  APIResponse,
  APIResponseError,
  APIResponseSuccess,
  IClient,
  SuperAgentError
} from '../definitions';

const FORMAT_ERROR_BODY_MAX_LENGTH = 1000;
const CONTENT_TYPE_JSON = 'application/json';
export const ERROR_UNKNOWN_CONTENT_TYPE = 'UNKNOWN_CONTENT_TYPE';
export const ERROR_UNKNOWN_RESPONSE_FORMAT = 'UNKNOWN_RESPONSE_FORMAT';

export class Client implements IClient {
  constructor(public host: string) {}

  static transform(r: superagent.Response): APIResponse {
    if (r.type !== CONTENT_TYPE_JSON) {
      throw ERROR_UNKNOWN_CONTENT_TYPE;
    }

    let j = <APIResponse>r.body;

    if (!j.meta) {
      throw ERROR_UNKNOWN_RESPONSE_FORMAT;
    }

    return j;
  }

  make(method: string, path: string): superagent.Request {
    return superagent(method, `${this.host}${path}`)
      .timeout(10000) // 10 second timeout
      .set('Content-Type', CONTENT_TYPE_JSON)
      .set('Accept', CONTENT_TYPE_JSON);
  }

  async do(req: superagent.Request): Promise<APIResponseSuccess> {
    const res = await Promise.resolve(req); // TODO: should be able to just do `await req`
    const r = Client.transform(res);

    if (isAPIResponseError(r)) {
      throw 'todo'; // TODO
    }

    return r;
  }
}

export function isAPIResponseSuccess(r: APIResponse): r is APIResponseSuccess {
  let res: APIResponseSuccess = <APIResponseSuccess>r;
  return r && res.data && typeof res.data === 'object';
}

export function isAPIResponseError(r: APIResponse): r is APIResponseError {
  let res: APIResponseError = <APIResponseError>r;
  return r && res.error && typeof res.error === 'object';
}

export function formatError(e: SuperAgentError): string {
  const res = e.response;
  const req = res.request;
  const statusCode = e.response.status;

  let f = '';

  try {
    const r = Client.transform(res);

    if (isAPIResponseSuccess(r)) {
      f += util.inspect(r);
    } else {
      f += `API Error ${statusCode}: ${req.method} ${req.url}\n`;
      f += util.inspect(r.error);
    }
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
