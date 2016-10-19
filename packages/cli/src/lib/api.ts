import * as superagent from 'superagent';

import {
  APIResponse,
  APIResponseError,
  APIResponseSuccess,
  IClient,
  IConfig
} from '../definitions';

const CONTENT_TYPE_JSON = 'application/json';
export const ERROR_UNKNOWN_CONTENT_TYPE = 'UNKNOWN_CONTENT_TYPE';
export const ERROR_UNKNOWN_RESPONSE_FORMAT = 'UNKNOWN_RESPONSE_FORMAT';

export class Client implements IClient {
  constructor(public host: string) {}

  make(method: string, path: string): superagent.Request {
    return superagent(method, `${this.host}${path}`)
      .set('Content-Type', CONTENT_TYPE_JSON)
      .set('Accept', CONTENT_TYPE_JSON);
  }

  async do(req: superagent.Request): Promise<APIResponseSuccess> {
    let res = await Promise.resolve(req); // TODO: should be able to just do `await req`

    if (res.type !== CONTENT_TYPE_JSON) {
      throw ERROR_UNKNOWN_CONTENT_TYPE;
    }

    let j = <APIResponseSuccess>res.body;

    if (!j.meta || !j.data) {
      throw ERROR_UNKNOWN_RESPONSE_FORMAT;
    }

    return j;
  }

  is<T extends APIResponseSuccess>(r: APIResponseSuccess, predicate: (rs: APIResponseSuccess) => boolean): r is T {
    return predicate(r);
  }
}
