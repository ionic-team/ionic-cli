import chalk from 'chalk';

import { App, IClient, IPaginator, ResourceClient, Response } from '../definitions';
import { isAppResponse, isAppsResponse } from '../guards';
import { createFatalAPIFormat } from './http';

export function formatName(app: Pick<App, 'name' | 'org'>) {
  if (app.org) {
    return `${chalk.dim(`${app.org.name} / `)}${app.name}`;
  }

  return app.name;
}

export interface AppClientDeps {
  readonly client: IClient;
  readonly token: string;
}

export interface AppCreateDetails {
  name: string;
}

export class AppClient implements ResourceClient<App, AppCreateDetails> {
  protected client: IClient;
  protected token: string;

  constructor({ client, token }: AppClientDeps) {
    this.client = client;
    this.token = token;
  }

  async load(id: string): Promise<App> {
    const { req } = await this.client.make('GET', `/apps/${id}`);
    req.set('Authorization', `Bearer ${this.token}`);
    const res = await this.client.do(req);

    if (!isAppResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  async create({ name }: AppCreateDetails): Promise<App> {
    const { req } = await this.client.make('POST', '/apps');
    req.set('Authorization', `Bearer ${this.token}`).send({ name });
    const res = await this.client.do(req);

    if (!isAppResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  paginate(): IPaginator<Response<App[]>> {
    return this.client.paginate(
      async () => {
        const { req } = await this.client.make('GET', '/apps');
        req.set('Authorization', `Bearer ${this.token}`);
        return { req };
      },
      isAppsResponse
    );
  }
}
