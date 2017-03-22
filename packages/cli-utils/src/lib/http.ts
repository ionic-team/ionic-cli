import * as util from 'util';

import * as chalk from 'chalk';
import * as superagent from 'superagent';

import {
  APIResponse,
  APIResponseError,
  APIResponseSuccess,
  IClient,
  HttpMethod,
  SuperAgentError
} from '../definitions';

import { isAPIResponseError, isAPIResponseSuccess } from '../guards';
import { FatalException } from './errors';

const FORMAT_ERROR_BODY_MAX_LENGTH = 1000;
const CONTENT_TYPE_JSON = 'application/json';
export const ERROR_UNKNOWN_CONTENT_TYPE = 'UNKNOWN_CONTENT_TYPE';
export const ERROR_UNKNOWN_RESPONSE_FORMAT = 'UNKNOWN_RESPONSE_FORMAT';

export class Client implements IClient {
  constructor(public host: string) {}

  static transform(r: superagent.Response): APIResponse {
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

  make(method: HttpMethod, path: string): superagent.Request {
    return superagent(method, `${this.host}${path}`)
      .timeout(10000) // 10 second timeout
      .set('Content-Type', CONTENT_TYPE_JSON)
      .set('Accept', CONTENT_TYPE_JSON);
  }

  async do(req: superagent.Request): Promise<APIResponseSuccess> {
    const res = await Promise.resolve(req); // TODO: should be able to just do `await req`
    const r = Client.transform(res);

    if (isAPIResponseError(r)) {
      throw new FatalException('API request was successful, but the response output format was that of an error.\n'
                             + formatAPIError(req, r));
    }

    return r;
  }
}

export function createFatalAPIFormat(req: superagent.SuperAgentRequest, res: APIResponse): FatalException {
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

export function formatAPIResponse(req: superagent.SuperAgentRequest, r: APIResponse) {
  if (isAPIResponseSuccess(r)) {
    return util.inspect(r);
  } else {
    return formatAPIError(req, r);
  }
}

export function formatAPIError(req: superagent.SuperAgentRequest, r: APIResponseError): string {
  return `API Error ${r.meta.status}: ${req.method} ${req.url}\n`
       + util.inspect(r.error);
}
