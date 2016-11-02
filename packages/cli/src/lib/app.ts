import {
  APIResponse,
  APIResponseSuccess,
  AppDetails,
  IApp,
  IClient,
  IProject,
  ISession
} from '../definitions';

import { createFatalAPIFormat, isAPIResponseSuccess } from './http';

interface AppResponse extends APIResponseSuccess {
  data: AppDetails;
}

function isAppDetails(d: any): d is AppDetails {
  let details: AppDetails = <AppDetails>d;
  return details && typeof details === 'object'
    && typeof details.id === 'string'
    && typeof details.name === 'string'
    && typeof details.slug === 'string';
}

function isAppResponse(r: APIResponse): r is AppResponse {
  let res: AppResponse = <AppResponse>r;
  return isAPIResponseSuccess(res) && isAppDetails(res.data);
}

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
