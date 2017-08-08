import {
  AppDetails,
  IApp,
  IClient,
  IPaginator,
  Response,
} from '../definitions';

import { createFatalAPIFormat } from './http';
import { isAppResponse, isAppsResponse } from '../guards';

export class App implements IApp {
  constructor(public token: string, protected client: IClient) {}

  async load(app_id: string): Promise<AppDetails> {
    const req = this.client.make('GET', `/apps/${app_id}`)
      .set('Authorization', `Bearer ${this.token}`)
      .send({});
    const res = await this.client.do(req);

    if (!isAppResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  list(): IPaginator<Response<AppDetails[]>> {
    return this.client.paginate(
      () => this.client.make('GET', '/apps').set('Authorization', `Bearer ${this.token}`),
      isAppsResponse,
    );
  }

  async create({ name }: { name: string; }) {
    const req = this.client.make('POST', '/apps')
      .set('Authorization', `Bearer ${this.token}`)
      .send({ name });
    const res = await this.client.do(req);

    if (!isAppResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }
}
