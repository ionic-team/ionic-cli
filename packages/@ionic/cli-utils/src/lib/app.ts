import {
  AppDetails,
  IClient,
  IPaginator,
  Response,
} from '../definitions';

import { isAppResponse, isAppsResponse } from '../guards';
import { createFatalAPIFormat } from './http';

export interface AppClientDeps {
  readonly client: IClient;
  readonly token: string;
}

export class AppClient {
  protected client: IClient;
  protected token: string;

  constructor({ client, token }: AppClientDeps) {
    this.client = client;
    this.token = token;
  }

  async load(id: string): Promise<AppDetails> {
    const { req } = await this.client.make('GET', `/apps/${id}`);
    req.set('Authorization', `Bearer ${this.token}`);
    const res = await this.client.do(req);

    if (!isAppResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  async paginate(): Promise<IPaginator<Response<AppDetails[]>>> {
    return this.client.paginate(
      async () => {
        const { req } = await this.client.make('GET', '/apps');
        req.set('Authorization', `Bearer ${this.token}`);
        return { req };
      },
      isAppsResponse
    );
  }

  async create({ name }: { name: string; }) {
    const { req } = await this.client.make('POST', '/apps');
    req.set('Authorization', `Bearer ${this.token}`).send({ name });
    const res = await this.client.do(req);

    if (!isAppResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }
}
