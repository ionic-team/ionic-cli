import {
  AppDetails,
  IApp,
  IClient,
} from '../definitions';

import { createFatalAPIFormat } from './http';
import { isAppResponse } from '../guards';

export class App implements IApp {
  constructor(protected appUserToken: string, protected client: IClient) {}

  async load(app_id: string): Promise<AppDetails> {
    const req = this.client.make('GET', `/apps/${app_id}`)
      .set('Authorization', `Bearer ${this.appUserToken}`)
      .send({});
    const res = await this.client.do(req);

    if (!isAppResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }
}
