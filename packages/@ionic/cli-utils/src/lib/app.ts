import {
  AppAssociation,
  AppDetails,
  AssociationType,
  IApp,
  IClient,
  IPaginator,
  Response,
} from '../definitions';

import { createFatalAPIFormat } from './http';
import { isAppResponse, isAppsResponse, isAppAssociationResponse } from '../guards';

export class App implements IApp {
  constructor(public token: string, protected client: IClient) {}

  async load(app_id: string): Promise<AppDetails> {
    const { req } = await this.client.make('GET', `/apps/${app_id}`);
    req.set('Authorization', `Bearer ${this.token}`).send({});
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
      isAppsResponse,
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

  async createAssociation(id: string, association: { repoId: number; type: AssociationType; branches: string[] }): Promise<AppAssociation> {
    const { req } = await this.client.make('POST', `/apps/${id}/repository`);

    req
      .set('Authorization', `Bearer ${this.token}`)
    .send({
      repository_id: association.repoId,
      type: association.type,
      branches: association.branches,
    });

    const res = await this.client.do(req);

    if (!isAppAssociationResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  async deleteAssociation(id: string): Promise<void> {
    const { req } = await this.client.make('DELETE', `/apps/${id}/repository`);

    req
      .set('Authorization', `Bearer ${this.token}`)
      .send({});

    await req;
  }

}
