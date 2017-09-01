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
    let { req } = await this.client.make('GET', `/apps/${app_id}`);
    req = req
      .set('Authorization', `Bearer ${this.token}`)
      .send({});
    const res = await this.client.do(req);

    if (!isAppResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  async paginate(): Promise<IPaginator<Response<AppDetails[]>>> {
    return this.client.paginate(
      async () => {
        let { req } = await this.client.make('GET', '/apps');
        req = req.set('Authorization', `Bearer ${this.token}`);
        return { req };
      },
      isAppsResponse,
    );
  }

  async create({ name }: { name: string; }) {
    let { req } = await this.client.make('POST', '/apps');
    req = req
      .set('Authorization', `Bearer ${this.token}`)
      .send({ name });
    const res = await this.client.do(req);

    if (!isAppResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }
}
