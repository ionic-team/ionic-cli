import { IClient, IPaginator, PaginateArgs, ResourceClientLoad, ResourceClientPaginate, Response, Snapshot } from '../definitions';

import { isSnapshotListResponse, isSnapshotResponse } from '../guards';
import { ResourceClient, createFatalAPIFormat } from './http';

export interface SnapshotClientDeps {
  readonly client: IClient;
  readonly token: string;
  readonly app: { id: string; };
}

export class SnapshotClient extends ResourceClient implements ResourceClientLoad<Snapshot>, ResourceClientPaginate<Snapshot> {
  protected client: IClient;
  protected token: string;
  protected app: { id: string; };

  constructor({ client, app, token }: SnapshotClientDeps) {
    super();
    this.client = client;
    this.token = token;
    this.app = app;
  }

  async load(id: string): Promise<Snapshot> {
    const { req } = await this.client.make('GET', `/apps/${this.app.id}/snapshots/${id}`);
    this.applyAuthentication(req, this.token);
    const res = await this.client.do(req);

    if (!isSnapshotResponse(res)) {
      throw createFatalAPIFormat(req, res);
    }

    return res.data;
  }

  paginate(args: Partial<PaginateArgs<Response<Snapshot[]>>> = {}): IPaginator<Response<Snapshot[]>> {
    return this.client.paginate({
      reqgen: async () => {
        const { req } = await this.client.make('GET', `/apps/${this.app.id}/snapshots`);
        this.applyAuthentication(req, this.token);
        return { req };
      },
      guard: isSnapshotListResponse,
    });
  }
}
