import {
  AppDetails,
  IApp,
  IClient,
  IProject,
  ISession
} from '../definitions';

import { createFatalAPIFormat } from './http';
import { isAppResponse } from '../guards';

export class App implements IApp {
  protected details: { [app_id: string]: AppDetails } = {};

  constructor(protected session: ISession, protected project: IProject, protected client: IClient) {}

  async load(app_id?: string): Promise<AppDetails> {
    if (!app_id) {
      app_id = await this.project.loadAppId();
    }

    if (!this.details[app_id]) {
      const req = this.client.make('GET', `/apps/${app_id}`)
        .set('Authorization', `Bearer ${await this.session.getAppUserToken(app_id)}`)
        .send({});
      const res = await this.client.do(req);

      if (!isAppResponse(res)) {
        throw createFatalAPIFormat(req, res);
      }

      this.details[app_id] = res.data;
    }

    return this.details[app_id];
  }
}
