import * as chalk from 'chalk';
import * as lodash from 'lodash';
import * as util from 'util';

import {
  APIResponse,
  APIResponsePageTokenMeta,
  APIResponseSuccess,
  ContentTypes,
  HttpMethod,
  IClient,
  IConfig,
  IPaginator,
  PagePaginatorState,
  PaginateArgs,
  PaginatorDeps,
  PaginatorGuard,
  PaginatorRequestGenerator,
  ResourceClientRequestModifiers,
  Response,
  SuperAgentError,
  TokenPaginatorState
} from '../definitions';
import { isAPIResponseError, isAPIResponseSuccess } from '../guards';

import { failure, strong } from './color';
import { FatalException } from './errors';
import { createRequest } from './utils/http';

export type SuperAgentRequest = import('superagent').SuperAgentRequest;
export type SuperAgentResponse = import('superagent').Response;

const FORMAT_ERROR_BODY_MAX_LENGTH = 1000;

export const ERROR_UNKNOWN_CONTENT_TYPE = 'UNKNOWN_CONTENT_TYPE';
export const ERROR_UNKNOWN_RESPONSE_FORMAT = 'UNKNOWN_RESPONSE_FORMAT';

export class Client implements IClient {
  constructor(public config: IConfig) {}

  async make(method: HttpMethod, path: string, contentType: ContentTypes = ContentTypes.json): Promise<{ req: SuperAgentRequest; }> {
    const url = path.startsWith('http://') || path.startsWith('https://') ? path : `${this.config.getAPIUrl()}${path}`;
    const { req } = await createRequest(method, url, this.config.getHTTPConfig());

    req
      .set('Content-Type', contentType)
      .set('Accept', ContentTypes.json);

    return { req };
  }

  async do(req: SuperAgentRequest): Promise<APIResponseSuccess> {
    const res = await req;
    const r = transformAPIResponse(res);

    if (isAPIResponseError(r)) {
      throw new FatalException(
        'API request was successful, but the response output format was that of an error.\n' +
        formatAPIResponse(req, r)
      );
    }

    return r;
  }

  paginate<T extends Response<object[]>>(args: PaginateArgs<T>): IPaginator<T> {
    return new Paginator<T>({ client: this, ...args });
  }
}

export class Paginator<T extends Response<object[]>> implements IPaginator<T, PagePaginatorState> {
  protected client: IClient;
  protected reqgen: PaginatorRequestGenerator;
  protected guard: PaginatorGuard<T>;
  protected max?: number;

  readonly state: PagePaginatorState;

  constructor({ client, reqgen, guard, state, max }: PaginatorDeps<T, PagePaginatorState>) {
    const defaultState = { page: 1, done: false, loaded: 0 };

    this.client = client;
    this.reqgen = reqgen;
    this.guard = guard;
    this.max = max;

    if (!state) {
      state = { page_size: 100, ...defaultState };
    }

    this.state = lodash.assign({}, state, defaultState);
  }

  next(): IteratorResult<Promise<T>> {
    if (this.state.done) {
      return { done: true } as IteratorResult<Promise<T>>; // TODO: why can't I exclude value?
    }

    return {
      done: false,
      value: (async () => {
        const { req } = await this.reqgen();

        req.query(lodash.pick(this.state, ['page', 'page_size']));

        const res = await this.client.do(req);

        if (!this.guard(res)) {
          throw createFatalAPIFormat(req, res);
        }

        this.state.loaded += res.data.length;

        if (
          res.data.length === 0 || // no resources in this page, we're done
          (typeof this.max === 'number' && this.state.loaded >= this.max) || // met or exceeded maximum requested
          (typeof this.state.page_size === 'number' && res.data.length < this.state.page_size) // number of resources less than page size, so nothing on next page
        ) {
          this.state.done = true;
        }

        this.state.page++;

        return res;
      })(),
    };
  }

  [Symbol.iterator](): this {
    return this;
  }
}

export class TokenPaginator<T extends Response<object[]>> implements IPaginator<T, TokenPaginatorState> {
  protected client: IClient;
  protected reqgen: PaginatorRequestGenerator;
  protected guard: PaginatorGuard<T>;
  protected max?: number;

  readonly state: TokenPaginatorState;

  constructor({ client, reqgen, guard, state, max }: PaginatorDeps<T, TokenPaginatorState>) {
    const defaultState = { done: false, loaded: 0 };

    this.client = client;
    this.reqgen = reqgen;
    this.guard = guard;
    this.max = max;

    if (!state) {
      state = { ...defaultState };
    }

    this.state = lodash.assign({}, state, defaultState);
  }

  next(): IteratorResult<Promise<T>> {
    if (this.state.done) {
      return { done: true } as IteratorResult<Promise<T>>; // TODO: why can't I exclude value?
    }

    return {
      done: false,
      value: (async () => {
        const { req } = await this.reqgen();

        if (this.state.page_token) {
          req.query({ page_token: this.state.page_token });
        }

        const res = await this.client.do(req);

        if (!this.isPageTokenResponseMeta(res.meta)) {
          throw createFatalAPIFormat(req, res);
        }

        const nextPageToken = res.meta.next_page_token;

        if (!this.guard(res)) {
          throw createFatalAPIFormat(req, res);
        }

        this.state.loaded += res.data.length;

        if (
          res.data.length === 0 || // no resources in this page, we're done
          (typeof this.max === 'number' && this.state.loaded >= this.max) || // met or exceeded maximum requested
          !nextPageToken // no next page token, must be done
        ) {
          this.state.done = true;
        }

        this.state.page_token = nextPageToken;

        return res;
      })(),
    };
  }

  isPageTokenResponseMeta(meta: any): meta is APIResponsePageTokenMeta {
    return meta
      && (!meta.prev_page_token || typeof meta.prev_page_token === 'string')
      && (!meta.next_page_token || typeof meta.next_page_token === 'string');
  }

  [Symbol.iterator](): this {
    return this;
  }
}

export abstract class ResourceClient {
  protected applyModifiers(req: import('superagent').Request, modifiers?: ResourceClientRequestModifiers) {
    if (!modifiers) {
      return;
    }

    if (modifiers.fields) {
      req.query({ fields: modifiers.fields });
    }
  }

  protected applyAuthentication(req: import('superagent').Request, token: string) {
    req.set('Authorization', `Bearer ${token}`);
  }
}

export function transformAPIResponse(r: SuperAgentResponse): APIResponse {
  if (r.status === 204) {
    r.body = { meta: { status: 204, version: '', request_id: '' } };
  }

  if (r.status !== 204 && r.type !== ContentTypes.json) {
    throw ERROR_UNKNOWN_CONTENT_TYPE;
  }

  const j = r.body as APIResponse;

  if (!j.meta) {
    throw ERROR_UNKNOWN_RESPONSE_FORMAT;
  }

  return j;
}

export function createFatalAPIFormat(req: SuperAgentRequest, res: APIResponse): FatalException {
  return new FatalException(
    'API request was successful, but the response format was unrecognized.\n' +
    formatAPIResponse(req, res)
  );
}

export function formatSuperAgentError(e: SuperAgentError): string {
  const res = e.response;
  const req = (res as any).request; // TODO: `req` and `request` exist: https://visionmedia.github.io/superagent/docs/test.html
  const statusCode = e.response.status;

  let f = '';

  try {
    const r = transformAPIResponse(res);
    f += formatAPIResponse(req, r);
  } catch (e) {
    f += (
      `HTTP Error ${statusCode}: ${req.method.toUpperCase()} ${req.url}\n` +
      '\n' + (res.text ? res.text.substring(0, FORMAT_ERROR_BODY_MAX_LENGTH) : '<no buffered body>')
    );

    if (res.text && res.text.length > FORMAT_ERROR_BODY_MAX_LENGTH) {
      f += ` ...\n\n[ truncated ${res.text.length - FORMAT_ERROR_BODY_MAX_LENGTH} characters ]`;
    }
  }

  return failure(strong(f));
}

function formatAPIResponse(req: SuperAgentRequest, r: APIResponse): string {
  return formatResponseError(req, r.meta.status, isAPIResponseSuccess(r) ? r.data : r.error);
}

export function formatResponseError(req: SuperAgentRequest, status?: number, body?: object | string): string {
  return failure(
    `Request: ${req.method} ${req.url}\n` +
    (status ? `Response: ${status}\n` : '') +
    (body ? `Body: \n${util.inspect(body, { colors: chalk.level > 0 })}` : '')
  );
}
