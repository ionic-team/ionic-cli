import chalk from 'chalk';

import { App, AppAssociation, AssociationType, IClient, IPaginator, PaginateArgs, PaginatorState, ResourceClientCreate, ResourceClientLoad, ResourceClientPaginate, Response } from '../definitions';
import { isAppAssociationResponse, isAppResponse, isAppsResponse } from '../guards';

import { ResourceClient, createFatalAPIFormat } from './http';

export function formatName(app: Pick<App, 'name' | 'org'>) {
  if (app.org) {
    return `${chalk.dim(`${app.org.name} / `)}${app.name}`;
  }

  return app.name;
}

export interface AppClientDeps {
  readonly client: IClient;
}

export interface AppCreateDetails {
  readonly name: string;
  readonly org_id?: string;
}

export class AppClient extends ResourceClient implements ResourceClientLoad<App>, ResourceClientCreate<App, AppCreateDetails>, ResourceClientPaginate<App> {
  constructor(readonly token: string, readonly e: AppClientDeps) {
    super();
  }

  async load(id: string): Promise<App> {
    const { req } = await this.e.client.make('GET', `/apps/${id}`);
    this.applyAuthentication(req, this.token);
    const res = await this.e.client.do(req);

    if (!isAppResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  async create(details: AppCreateDetails): Promise<App> {
    const { req } = await this.e.client.make('POST', '/apps');
    this.applyAuthentication(req, this.token);
    req.send(details);
    const res = await this.e.client.do(req);

    if (!isAppResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  paginate(args: Partial<PaginateArgs<Response<App[]>>> = {}, orgId?: string): IPaginator<Response<App[]>, PaginatorState> {
    return this.e.client.paginate({
      reqgen: async () => {
        const { req } = await this.e.client.make('GET', '/apps');
        this.applyAuthentication(req, this.token);
        if (orgId) {
          req.send({ org_id: orgId });
        }
        return { req };
      },
      guard: isAppsResponse,
      ...args,
    });
  }

  async createAssociation(id: string, association: { repoId: number; type: AssociationType; branches: string[] }): Promise<AppAssociation> {
    const { req } = await this.e.client.make('POST', `/apps/${id}/repository`);

    req
      .set('Authorization', `Bearer ${this.token}`)
      .send({
        repository_id: association.repoId,
        type: association.type,
        branches: association.branches,
      });

    const res = await this.e.client.do(req);

    if (!isAppAssociationResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  async deleteAssociation(id: string): Promise<void> {
    const { req } = await this.e.client.make('DELETE', `/apps/${id}/repository`);

    req
      .set('Authorization', `Bearer ${this.token}`)
      .send({});

    await req;
  }
}
